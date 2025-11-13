/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import * as v1 from 'firebase-functions/v1';
import * as v2 from 'firebase-functions/v2';
import * as admin from 'firebase-admin';



type Indexable = Record<string, string>;
export const hellworld = v2.https.onRequest((request, response) => {
    debugger;
    const name = request.params[0].replace('/', '');
    const items: Indexable = { lamp: 'This is a lamp', chair: 'Good chair'};
    const message = items[name] ?? 'Unknown item';
    response.send(`<h1>${message}</h1>`);
});


// Attention: changes data if not disabled due to onCreate()
/*type Sku = { name: string; usd: number; eur?: number};
const USD_TO_EUROS = 0.95;
export const newsku = v1.firestore.document('/inventory/{sku}')
    .onCreate(snapshot => {
         const data = snapshot.data() as Sku;
         const eur = data.usd * USD_TO_EUROS;
         return snapshot.ref.set({ eur, ...data }, {merge: true});
    });*/



admin.initializeApp();
// Nur, wenn wir im Emulator sind, lokal verbinden
if (process.env.FUNCTIONS_EMULATOR) {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    console.log('🔥 Firestore Emulator aktiv');
}


type Point = { x: number; y: number };
type Measurement = { trace: Point[] };

// Local dummy data — five different measurement examples

 export const seedMeasurements = v2.https.onRequest(async (req, res) => {
     const db = admin.firestore();

     const measurements: Measurement[] = [
         { trace: [{ x: 0.1, y: 2.3 }, { x: 0.2, y: 2.7 }, { x: 0.3, y: 3.1 }] },
         { trace: [{ x: 0.0, y: 1.0 }, { x: 0.1, y: 1.5 }, { x: 0.2, y: 2.0 }] },
         { trace: [{ x: 0.1, y: 0.9 }, { x: 0.2, y: 1.8 }, { x: 0.3, y: 2.7 }] },
         { trace: [{ x: 0.1, y: 2.1 }, { x: 0.2, y: 2.4 }, { x: 0.3, y: 3.0 }] },
         { trace: [{ x: 0.1, y: 1.9 }, { x: 0.2, y: 2.2 }, { x: 0.3, y: 2.8 }] }
     ];

     const batch = db.batch();

     measurements.forEach(m => {
         const ref = db.collection('measurements').doc();
         batch.set(ref, m);
     });

     await batch.commit();

     res.send('5 Messungen erfolgreich in den lokalen Firestore-Emulator geschrieben.');
 })




export const getMeasurements = v2.https.onRequest(async (req, res) => {
    try {
        if(req.method!= 'GET') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        const db = admin.firestore();
        const snapshot = await db.collection('measurements').get();

        // Wenn keine Dokumente vorhanden sind
        if (snapshot.empty) {
            res.status(404).json({ error: 'Keine Messdaten vorhanden.' });
            return;
        }
        //map all documents to Plain-JSON
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Header setzen (hilfreich für Flutter-Web oder Tests)
        res.set('Access-Control-Origin', '*');
        res.set('Content-Type', 'application/json');

        res.status(200).json(data);
    } catch (error) {
        console.error('Fehler beim Abrufen: ', error);
        res.status(500).send('Internal Server Error');
    }
});



 export const getRandomMeasurement = v2.https.onRequest(async (req, res) => {
    try {
        if(req.method!= 'GET') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const db = admin.firestore();
        const snapshot = await db.collection('measurements').get();

        // Wenn keine Dokumente vorhanden sind
        if (snapshot.empty) {
            res.status(404).json({ error: 'Keine Messdaten vorhanden.' });
            return;
        }

        const docs = snapshot.docs;
        const randomIndex = Math.floor(Math.random() * docs.length);
        const randomDoc = docs[randomIndex];
        const data = {id:randomDoc.id, ...randomDoc.data() };

        // Header setzen (damit Flutter JSON korrekt interpretiert)
        res.set('Content-Type', 'application/json');
        res.status(200).json(data);
    } catch (error) {
        console.error('Fehler beim Abrufen:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
 });



// REAGIERT (!) (onCreate) auf das Erstellen eines neuen Measurement-Dokuments im Emulator
export const newMeasurement = v1.firestore
    .document('/measurements/{measurement}')
    .onCreate(snapshot => {
        const data = snapshot.data() as Measurement;

        // Beispielhafte „Weiterverarbeitung“ wie beim newsku-Beispiel:
        // z. B. ersten Punkt herausgreifen
        const firstPoint = data.trace[0];

        // Schreibt den ersten Punkt zusätzlich ins Dokument zurück
        return snapshot.ref.set({ firstPoint, ...data }, { merge: true });
    });













