with open('src/components/screens/IdentityBadgeScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace("""                      <button 
                        onClick={() => setVerifyInput('IDB-DEMO-123')}
                        className="text-xs text-indigo-600 hover:underline text-center col-span-2"
                      >
                        Try Demo QR Identifier
                      </button>""", "")

with open('src/components/screens/IdentityBadgeScreen.tsx', 'w') as f:
    f.write(content)
