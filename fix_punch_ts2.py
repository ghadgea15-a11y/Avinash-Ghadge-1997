import re

with open('src/services/suspiciousPunchService.ts', 'r') as f:
    content = f.read()

content = content.replace("geoResult.result === 'REJECTED'", "geoResult.result === 'OUTSIDE_GEOFENCE'")

with open('src/services/suspiciousPunchService.ts', 'w') as f:
    f.write(content)
