import shutil
import os

source = r'c:\Users\DELL\Desktop\teranggo\Fullstack\terango\app\custom-delivery\index-new.tsx'
dest = r'c:\Users\DELL\Desktop\teranggo\Fullstack\terango\app\custom-delivery\index.tsx'

try:
    shutil.copy2(source, dest)
    print("✓ File replaced successfully!")
    print("  index.tsx has been updated with the new redesign")
except Exception as e:
    print(f"✗ Error: {e}")
    exit(1)
