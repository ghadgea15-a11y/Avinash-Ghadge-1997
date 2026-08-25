import sys

with open('src/services/firestoreService.ts', 'r') as f:
    code = f.read()

bad_str = "if (assetData.status !== 'AVAILABLE' && assetData.status !== 'REPAIRED' && assetData.status !== 'NEW')"
good_str = "if (assetData.status !== 'AVAILABLE' && assetData.status !== 'RETURNED')"

if bad_str in code:
    code = code.replace(bad_str, good_str)
    with open('src/services/firestoreService.ts', 'w') as f:
        f.write(code)
    print("Fixed types")
else:
    print("Could not find bad str")
