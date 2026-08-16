import * as fs from 'fs';

let content = fs.readFileSync('src/services/firestoreService.ts', 'utf-8');
content = content.replace(
  "    } catch (err) {\n      console.warn('[FirestoreService] subscribeToAssetMaintenance exception:', err);\n      onData([]);\n      return () => {};\n    }\n  static subscribeToTasks",
  "    } catch (err) {\n      console.warn('[FirestoreService] subscribeToAssetMaintenance exception:', err);\n      onData([]);\n      return () => {};\n    }\n  }\n  static subscribeToTasks"
);
fs.writeFileSync('src/services/firestoreService.ts', content);
