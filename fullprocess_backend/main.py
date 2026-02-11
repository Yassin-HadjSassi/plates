import os
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from ultralytics import YOLO
import shutil
import uuid
import base64
import threading
import time
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)

# Model Paths
MODELS_DIR = os.path.join(BASE_DIR, "models")
PLATE_DETECTION_MODEL_PATH = os.path.join(MODELS_DIR, "best_detect.pt")
OCR_MODEL_PATH = os.path.join(MODELS_DIR, "best_ocr.pt")

# Asset Paths
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
FONT_PATH = os.path.join(ASSETS_DIR, "din1451alt.ttf")
LOGO_PATH = os.path.join(ASSETS_DIR, "Tunisia_02.png")

if not os.path.exists(PLATE_DETECTION_MODEL_PATH):
    raise FileNotFoundError(f"Plate detection model not found at {PLATE_DETECTION_MODEL_PATH}")
if not os.path.exists(OCR_MODEL_PATH):
    raise FileNotFoundError(f"OCR model not found at {OCR_MODEL_PATH}")

print(f"Loading Plate Detection Model from: {PLATE_DETECTION_MODEL_PATH}")
plate_model = YOLO(PLATE_DETECTION_MODEL_PATH)

print(f"Loading OCR Model from: {OCR_MODEL_PATH}")
ocr_model = YOLO(OCR_MODEL_PATH)

UPLOAD_DIR = os.path.join(BASE_DIR, "temp_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- GLOBAL STATE FOR LIVE STREAM ---
# Key: Camera URL (or normalized ID), Value: Detection Result
latest_detections = {}
results_lock = threading.Lock()

# --- UTILITY FUNCTIONS ---

def generate_synthetic_plate(left_txt, right_txt):
    """Generates a 'perfect' synthetic plate Image."""
    plate_w, plate_h = 520, 115
    plate = Image.new("RGB", (plate_w, plate_h), (25, 25, 25))
    draw = ImageDraw.Draw(plate)
    
    try:
        font = ImageFont.truetype(FONT_PATH, size=95)
    except:
        font = ImageFont.load_default()
        
    try:
        logo = Image.open(LOGO_PATH).convert("RGBA")
        logo_gray = logo.convert("L").point(lambda p: 255 if p > 70 else 0)
        logo_clean = Image.new("RGBA", logo.size, (0, 0, 0, 0))
        white_img = Image.new("RGBA", logo.size, (245, 245, 245, 255))
        logo_clean.paste(white_img, (0, 0), mask=logo_gray)
    except:
        logo_clean = None

    l_w = draw.textlength(left_txt, font=font)
    r_w = draw.textlength(right_txt, font=font)
    
    logo_w, logo_h = 0, 0
    if logo_clean:
        logo_h = int(plate_h * 0.7)
        logo_w = int(logo_clean.width * (logo_h / logo_clean.height))
        logo_res = logo_clean.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
    
    total_w = l_w + logo_w + r_w + 60
    curr_x = (plate_w - total_w) // 2
    
    # Draw Left
    draw.text((curr_x, (plate_h - 100) // 2), left_txt, font=font, fill=(245, 245, 245))
    curr_x += l_w + 30
    
    # Paste Logo
    if logo_clean:
        plate.paste(logo_res, (int(curr_x), (plate_h - logo_h) // 2), logo_res)
        curr_x += logo_w + 30
    
    # Draw Right
    draw.text((curr_x, (plate_h - 100) // 2), right_txt, font=font, fill=(245, 245, 245))
    
    # Add thin border
    draw.rectangle([0, 0, plate_w-1, plate_h-1], outline=(200, 200, 200), width=3)
    
    # Encode to base64
    from io import BytesIO
    buffered = BytesIO()
    plate.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def order_points(pts):
    """Sorts coordinates: top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def four_point_transform(image, pts):
    """Homography rectification to flatten the plate."""
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))
    dst = np.array([[0, 0], [maxWidth - 1, 0], [maxWidth - 1, maxHeight - 1], [0, maxHeight - 1]], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(image, M, (maxWidth, maxHeight))

def calculate_iou(boxA, boxB):
    """Standard IoU to prevent double-counting digits"""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    interArea = max(0, xB - xA + 1) * max(0, yB - yA + 1)
    boxAArea = (boxA[2] - boxA[0] + 1) * (boxA[3] - boxA[1] + 1)
    boxBArea = (boxB[2] - boxB[0] + 1) * (boxB[3] - boxB[1] + 1)
    return interArea / float(boxAArea + boxBArea - interArea)

def production_plate_parser(result):
    """Parses OCR result into text and boxes, matching backend logic."""
    boxes = result.boxes.data.tolist()
    # 1. Filter by Confidence and IoU (Remove overlaps)
    boxes = sorted(boxes, key=lambda x: x[4], reverse=True)
    filtered = []
    for b in boxes:
        if not any(calculate_iou(b[:4], f[:4]) > 0.3 for f in filtered):
            filtered.append(b)

    # 2. Find the strongest Logo (Anchor) -- Class 10 is TUNISIA
    logos = [b for b in filtered if int(b[5]) == 10]
    
    # Formatted boxes for frontend
    formatted_boxes = []
    for b in filtered:
        formatted_boxes.append({
            "bbox": [float(b[0]), float(b[1]), float(b[2]), float(b[3])],
            "confidence": float(b[4]),
            "class_id": int(b[5]),
            "label": "TUNISIA" if int(b[5]) == 10 else str(int(b[5]))
        })

    left_str, right_str = "", ""
    plate_text = ""

    if not logos:
        # Fallback to simple left-to-right if logo is missing
        final_sorted = sorted(filtered, key=lambda x: x[0])
        plate_text = "".join(["تونس" if int(b[5]) == 10 else str(int(b[5])) for b in final_sorted])
        # Try to heuristically split if needed, or just assign all to one widely
        # For synthetic plate, if no logo, we might just dump everything in left or right
        left_str = plate_text
    else:
        best_logo = logos[0]
        logo_x = best_logo[0]

        # 3. Sort numbers relative to the logo
        left_side = sorted([b for b in filtered if int(b[5]) != 10 and b[0] < logo_x], key=lambda x: x[0])
        right_side = sorted([b for b in filtered if int(b[5]) != 10 and b[0] > logo_x], key=lambda x: x[0])

        # 4. Construct Final String
        left_str = "".join([str(int(b[5])) for b in left_side])
        right_str = "".join([str(int(b[5])) for b in right_side])
        plate_text = f"{left_str}تونس{right_str}"

    return plate_text, formatted_boxes, left_str, right_str

def get_best_plate_crop(model, image):
    """Detects plate using OBB model and returns the warped crop."""
    results = model(image, verbose=False)
    
    best_crop = None
    best_conf = 0.0
    
    for res in results:
        # Check for OBB first
        if res.obb is not None and len(res.obb) > 0:
            # Get best OBB
            for obb in res.obb:
                conf = obb.conf.item()
                if conf > best_conf:
                    corners = obb.xyxyxyxy.cpu().numpy()[0]
                    best_crop = four_point_transform(image, corners)
                    best_conf = conf
        
        # Check for regular boxes (Fallback)
        elif res.boxes is not None and len(res.boxes) > 0:
             # Find best box
             for box in res.boxes:
                 conf = box.conf.item()
                 if conf > best_conf:
                     x1, y1, x2, y2 = box.xyxy.cpu().numpy()[0].astype(int)
                     # Add padding
                     h, w = image.shape[:2]
                     x1, y1 = max(0, x1-10), max(0, y1-10)
                     x2, y2 = min(w, x2+10), min(h, y2+10)
                     best_crop = image[y1:y2, x1:x2]
                     best_conf = conf

    return best_crop

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Save the file temporarily
    file_id = str(uuid.uuid4())
    temp_path = os.path.join(UPLOAD_DIR, f"{file_id}_{file.filename}")
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Read the image
        img = cv2.imread(temp_path)
        if img is None:
            return {"error": "Invalid image file"}

        # 1. Detect Plate using Fallback Pipeline
        # Pipeline attempt sequence from licence_detection_fallback.py
        attempts = [
            ("Original Style", lambda i: i),
            ("Shrink Height (80%)", lambda i: cv2.resize(i, (i.shape[1], int(i.shape[0] * 0.8)))),
            ("Shrink Width (80%)", lambda i: cv2.resize(i, (int(i.shape[1] * 0.8), i.shape[0]))),
            ("Rotation 90°", lambda i: cv2.rotate(i, cv2.ROTATE_90_CLOCKWISE)),
            ("Rotation 180°", lambda i: cv2.rotate(i, cv2.ROTATE_180)),
            ("Rotation 270°", lambda i: cv2.rotate(i, cv2.ROTATE_90_COUNTERCLOCKWISE))
        ]

        plate_crop = None
        best_conf = 0.0

        for label, transform in attempts:
            print(f"[DEBUG] Trying detection with: {label}")
            try:
                test_img = transform(img.copy())
                # Run prediction
                results = plate_model(test_img, verbose=False)
                
                # Check results
                for res in results:
                    # Check for OBB first
                    if res.obb is not None and len(res.obb) > 0:
                        for obb in res.obb:
                            conf = obb.conf.item()
                            if conf > best_conf:
                                corners = obb.xyxyxyxy.cpu().numpy()[0]
                                plate_crop = four_point_transform(test_img, corners)
                                best_conf = conf
                                print(f"[SUCCESS] Found plate with {label} (Conf: {best_conf:.2f})")
                    
                    # Check for regular boxes (Fallback)
                    elif res.boxes is not None and len(res.boxes) > 0:
                         for box in res.boxes:
                             conf = box.conf.item()
                             if conf > best_conf:
                                 x1, y1, x2, y2 = box.xyxy.cpu().numpy()[0].astype(int)
                                 h, w = test_img.shape[:2]
                                 x1, y1 = max(0, x1-10), max(0, y1-10)
                                 x2, y2 = min(w, x2+10), min(h, y2+10)
                                 plate_crop = test_img[y1:y2, x1:x2]
                                 best_conf = conf
                                 print(f"[SUCCESS] Found plate (Box) with {label} (Conf: {best_conf:.2f})")
                
                if plate_crop is not None:
                    break

            except Exception as e:
                print(f"[WARNING] Transformation {label} failed: {e}")
                continue

        if plate_crop is None:
            return {"error": "No license plate detected even after fallbacks."}

        # 2. Extract Text using OCR Model on the crop
        # Matches backend logic: Resize -> Enhance -> Predict
        h, w = plate_crop.shape[:2]
        if h > 0 and w > 0:
             # 2.1 Resize to fixed size (640, 160) to match original backend training
             plate_crop_resized = cv2.resize(plate_crop, (640, 160))
             
             # 2.2 Enhance Contrast
             gray = cv2.cvtColor(plate_crop_resized, cv2.COLOR_BGR2GRAY)
             enhanced_gray = cv2.equalizeHist(gray)
             enhanced_rgb = cv2.cvtColor(enhanced_gray, cv2.COLOR_GRAY2BGR)
             
             # 2.3 Run OCR
             ocr_results = ocr_model.predict(enhanced_rgb, conf=0.50, verbose=False)
             
             # 2.4 Parse Results
             plate_text, formatted_boxes, left_str, right_str = production_plate_parser(ocr_results[0])
             
             # 2.5 Generate Synthetic Plate
             synthetic_plate_b64 = generate_synthetic_plate(left_str, right_str)
             
             # 2.6 Encode crop to base64
             _, buffer = cv2.imencode('.jpg', enhanced_rgb)
             plate_base64 = base64.b64encode(buffer).decode('utf-8')
             
             return {
                 "plate_text": plate_text,
                 "plate_parts": {"left": left_str, "right": right_str},
                 "crop_image": f"data:image/jpeg;base64,{plate_base64}",
                 "synthetic_plate": f"data:image/jpeg;base64,{synthetic_plate_b64}",
                 "crop_boxes": formatted_boxes,
                 "image_size": {"width": 640, "height": 160}
             }
        else:
             return {"error": "Invalid detection crop"}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
        
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/latest_result")
async def get_latest_result(url: str = Query("0")):
    # Normalize URL if needed
    if url == "0": url = 0
    
    with results_lock:
        return latest_detections.get(str(url), {
            "plate_text": "",
            "plate_parts": {"left": "", "right": ""},
            "synthetic_plate": "",
            "timestamp": 0
        })

async def gen_frames(camera_url):
    """Video streaming generator function."""
    # Handle '0' as webcam
    if camera_url == "0":
        camera_url = 0
    
    cap = cv2.VideoCapture(camera_url)
    if not cap.isOpened():
        print(f"[ERROR] Could not open video source: {camera_url}")
        return

    frame_count = 0
    while True:
        success, frame = cap.read()
        if not success:
            break
        
        frame_count += 1
        # Run detection every N frames to save CPU
        if frame_count % 3 == 0:
            try:
                # 1. Detect Plate (Supports OBB and Regular Boxes)
                res = plate_model(frame, verbose=False, conf=0.45)
                for r in res:
                    plate_crop = None
                    rect_coords = None
                    
                    # Check for OBB first
                    if r.obb is not None and len(r.obb) > 0:
                        obb = r.obb[0]
                        corners = obb.xyxyxyxy.cpu().numpy()[0]
                        plate_crop = four_point_transform(frame, corners)
                        
                        # Draw OBB polygon
                        pts = corners.astype(np.int32).reshape((-1, 1, 2))
                        cv2.polylines(frame, [pts], isClosed=True, color=(0, 255, 0), thickness=2)
                        rect_coords = (int(corners[0][0]), int(corners[0][1]))
                    
                    # Fallback to regular boxes
                    elif r.boxes is not None and len(r.boxes) > 0:
                        box = r.boxes[0]
                        x1, y1, x2, y2 = box.xyxy.cpu().numpy()[0].astype(int)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        
                        h, w = frame.shape[:2]
                        px1, py1 = max(0, x1-5), max(0, y1-5)
                        px2, py2 = min(w, x2+5), min(h, y2+5)
                        plate_crop = frame[py1:py2, px1:px2]
                        rect_coords = (x1, y1)

                    if plate_crop is not None and plate_crop.size > 0:
                        # 2. RUN OCR
                        crop_resized = cv2.resize(plate_crop, (640, 160))
                        gray = cv2.cvtColor(crop_resized, cv2.COLOR_BGR2GRAY)
                        enhanced = cv2.equalizeHist(gray)
                        enhanced_rgb = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
                        
                        ocr_res = ocr_model.predict(enhanced_rgb, conf=0.55, verbose=False)
                        if ocr_res and len(ocr_res[0].boxes) > 0:
                            p_text, _, l_str, r_str = production_plate_parser(ocr_res[0])
                            
                            # Draw OCR result on live frame (Use TU for display as requested)
                            display_text = p_text.replace("تونس", "TU")
                            if rect_coords:
                                cv2.putText(frame, display_text, (rect_coords[0], rect_coords[1] - 10), 
                                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)

                            # Update Latest State
                            with results_lock:
                                # Use str(camera_url) as key
                                key = str(camera_url)
                                current_data = latest_detections.get(key, {})
                                
                                # Only update if new text or effectively different
                                if p_text != current_data.get("plate_text", ""):
                                    latest_detections[key] = {
                                        "plate_text": p_text,
                                        "plate_parts": {"left": l_str, "right": r_str},
                                        "synthetic_plate": f"data:image/jpeg;base64,{generate_synthetic_plate(l_str, r_str)}",
                                        "timestamp": time.time()
                                    }

            except Exception as e:
                print(f"[STREAM ERROR] {e}")

        # Encode frame to JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        if not ret:
            continue
        
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.get("/video_feed")
async def video_feed(url: str = Query("0")):
    return StreamingResponse(gen_frames(url), 
                           media_type="multipart/x-mixed-replace; boundary=frame")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
