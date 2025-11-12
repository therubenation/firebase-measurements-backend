/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
//import * as v1 from 'firebase-functions/v1';
import * as v2 from 'firebase-functions/v2';
import * as admin from 'firebase-admin';



/*type Indexable = Record<string, string>;

export const hellworld = v2.https.onRequest((request, response) => {
    debugger;
    const name = request.params[0].replace('/', '');
    const items: Indexable = { lamp: 'This is a lamp', chair: 'Good chair'};
    const message = items[name] ?? 'Unknown item';
    response.send(`<h1>${message}</h1>`);
});*/

/*type Sku = { name: string; usd: number; eur?: number};
const USD_TO_EUROS = 0.95;
export const newsku = v1.firestore.document('/inventory/{sku}')
    .onCreate(snapshot => {
         const data = snapshot.data() as Sku;
         const eur = data.usd * USD_TO_EUROS;
         return snapshot.ref.set({ eur, ...data }, {merge: true});
    });*/

admin.initializeApp();

type Point = { x: number; y: number };
type Measurement = { trace: Point[] };

// Local dummy data — five different measurement examples
const measurements: Measurement[] = [
    { trace: [{ x: 0.1, y: 2.3 }, { x: 0.2, y: 2.7 }, { x: 0.3, y: 3.1 }] },
    { trace: [{ x: 0.0, y: 1.0 }, { x: 0.1, y: 1.5 }, { x: 0.2, y: 2.0 }] },
    { trace: [{ x: 0.1, y: 0.9 }, { x: 0.2, y: 1.8 }, { x: 0.3, y: 2.7 }] },
    { trace: [{ x: 0.1, y: 2.1 }, { x: 0.2, y: 2.4 }, { x: 0.3, y: 3.0 }] },
    { trace: [{ x: 0.1, y: 1.9 }, { x: 0.2, y: 2.2 }, { x: 0.3, y: 2.8 }] }
];

// HTTP endpoint: seeds Firestore with the above measurements
export const seedMeasurements = v2.https.onRequest(async (_req, res) => {
    const db = admin.firestore();
    const batch = db.batch();

    measurements.forEach(m => {
        const ref = db.collection('measurements').doc();
        batch.set(ref, m);
    });

    await batch.commit();
    res.send('Measurements seeded successfully.');
});









