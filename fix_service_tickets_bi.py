import re

with open('src/services/biService.ts', 'r') as f:
    content = f.read()

content = content.replace("'service_tickets'", "'serviceTickets'")

with open('src/services/biService.ts', 'w') as f:
    f.write(content)
