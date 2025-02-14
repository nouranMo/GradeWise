import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "../../../../../../../../.."))
YOLO_PATH = os.path.join(PROJECT_ROOT, "YOLOv")

print(f"BASE_DIR: {BASE_DIR}")
print(f"PROJECT_ROOT: {PROJECT_ROOT}")
print(f"YOLO_PATH: {YOLO_PATH}")

if os.path.exists(YOLO_PATH):
    print("✅ YOLOv directory found!")
else:
    print("❌ YOLOv directory NOT found!")
