import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, query, limit, collectionGroup } from 'firebase/firestore';
import * as fs from 'fs';

// Read config from existing file or environment if available, or just use the local src/firebase.ts by running this through tsx
