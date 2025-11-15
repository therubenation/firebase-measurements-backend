/**
 * Firebase Cloud Functions – Measurement API
 * Provides local and deployable HTTP endpoints for seeding and retrieving measurement data.
 */

// TODO Remove all trivia references before deployment, including asset files and all firebase functions

import * as v1 from 'firebase-functions/v1';
import * as v2 from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

type Indexable = Record<string, string>;

/**
 * Simple test endpoint returning HTML message based on URL param.
 */
export const helloworld = v2.https.onRequest((request, response) => {
    debugger;
    const name = request.params[0].replace('/', '');
    const items: Indexable = { lamp: 'This is a lamp', chair: 'Good chair' };
    const message = items[name] ?? 'Unknown item';
    response.send(`<h1>${message}</h1>`);
});

admin.initializeApp();

// Connect to Firestore emulator when running locally
if (process.env.FUNCTIONS_EMULATOR) {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    console.log('Firestore Emulator active');
}

type Point = { x: number; y: number };
type Measurement = { trace: Point[] };



/**
 * Returns one random measurement document as JSON.
 */
export const getRandomMeasurement = v2.https.onRequest(async (req, res) => {
    try {
        if (req.method !== 'GET') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const db = admin.firestore();
        const snapshot = await db.collection('measurementData').get();

        if (snapshot.empty) {
            res.status(404).json({ error: 'Keine Messdaten vorhanden.' });
            return;
        }

        const docs = snapshot.docs;
        // random
        const randomDoc = docs[Math.floor(Math.random() * docs.length)];
        const data = { id: randomDoc.id, ...randomDoc.data() };

        res.set('Content-Type', 'application/json');
        res.status(200).json(data);
    } catch (error) {
        console.error('Fehler beim Abrufen:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

//TODO change Method description from local before deploying
/**
 * HTTP endpoint that seeds the Firestore emulator with multiple measurement files.
 *
 * Reads all `.json` files from `/assets/original_measurement_data`, normalizes each file's
 * structure using `normalizeMeasurementData()` to ensure Firestore compatibility,
 * and writes them as individual documents to the `measurementData` collection.
 *
 * Intended for local development and testing — connects automatically to the
 * Firestore emulator when running in the emulator environment.
 *
 * @route GET /seedMultipleMeasurementFiles
 * @returns 200 OK with the number of files seeded, or an error message if seeding fails.
 */
export const seedMultipleMeasurementFilesFromAssets = v2.https.onRequest(async (_req, res) => {
    try {
        const db = admin.firestore();
        //Path to measurement data
        const assetsDirPath = path.join(__dirname, '../assets/original_measurement_data/with_meta_data');

        const files = fs.readdirSync(assetsDirPath).filter(f => f.endsWith('.json'));

        if (files.length === 0) {
            res.status(404).send('No JSON files found in /original_measurement_data/with_meta_data');
            return;
        }

        const batch = db.batch();

        files.forEach(file => {
            const filePath = path.join(assetsDirPath, file);
            const fileData = fs.readFileSync(filePath, 'utf-8');
            const rawData = JSON.parse(fileData);

            // normalize measurement data
            const measurementData = normalizeMeasurementData(rawData);

            const ref = db.collection('measurementData').doc(path.parse(file).name);

            console.log('Raw keys:', Object.keys(rawData));
            console.log('Example data snippet:', rawData.points?.[0]);

            batch.set(ref, measurementData);
            console.log(`Added ${file}`);
        });

        await batch.commit();
        res.status(200).send(`Seeded ${files.length} measurementData files into Firestore emulator.`); // TODO after deployment: scratch "emulator"
    } catch (error) {
        console.error('Error seeding measurementData files: ', error);
        res.status(500).send('Error seeding measurement data');
    }
});


// TODO Remove before deployment if no longer needed
/**
 * Seeds the Firestore emulator with five static measurement documents.
 */
export const seedMeasurements = v2.https.onRequest(async (_req, res) => {
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
        const ref = db.collection('measurementData').doc();
        batch.set(ref, m);
    });

    await batch.commit();
    res.send('5 Messungen erfolgreich in den lokalen Firestore-Emulator geschrieben.');
});


// TODO Remove before deployment
/**
 * Seeds the Firestore emulator with trivia data read from assets/trivia.json.
 */
export const seedTriviaFromFile = v2.https.onRequest(async (_req, res) => {
    try {
        const db = admin.firestore();

        // Path to your trivia.json inside the functions folder
        const filePath = path.join(__dirname, '../assets/trivia/trivia.json');
        const fileData = fs.readFileSync(filePath, 'utf-8');
        const trivia = JSON.parse(fileData);

        // Example JSON structure:
        // { "text": "Test Text", "number": 1, "found": true, "type": "trivia" }

        await db.collection('trivia').add(trivia);

        res.status(200).send('trivia.json successfully written to local Firestore emulator.');
    } catch (error) {
        console.error('Error seeding trivia:', error);
        res.status(500).send('Error seeding trivia data.');
    }
});






/**
 * Firestore trigger (onCreate): adds the first trace point to each new measurement.
 * Kept for reference based on tutorial example (newsku pattern).
 */
export const newMeasurement = v1.firestore
    .document('/measurements/{measurement}')
    .onCreate(snapshot => {
        const data = snapshot.data() as Measurement;
        const firstPoint = data.trace[0];
        return snapshot.ref.set({ firstPoint, ...data }, { merge: true });
    });




// ----------------------------HELPER FUNCTIONS-----------------------------------

/**
 * Converts measurement format
 *   {
 *     "xUnit": "mV",
 *     "yUnit": "nA",
 *     "xScale": 1,
 *     "yScale": 10,
 *     "points": [[x, y], ...]
 *   }
 * into Firestore-compatible structure
 *   {
 *     "xUnit": "...",
 *     "yUnit": "...",
 *     "xScale": ...,
 *     "yScale": ...,
 *     "trace": [{x, y}, ...]
 *   }
 */
function normalizeMeasurementData(raw: any) {
    let trace: { x: number; y: number }[] | undefined;

    // new format with points
    if (Array.isArray(raw.points)) {
        trace = raw.points
            .flat() // remove nesting if present
            .map((pair: any) => {
                if (Array.isArray(pair)) {
                    return { x: pair[0], y: pair[1] };
                }
                return pair;
            });
    }

    // legacy format
    if (!trace && Array.isArray(raw.result)) {
        trace = raw.result
            .flat()
            .map((pair: any) =>
                Array.isArray(pair) ? { x: pair[0], y: pair[1] } : pair
            );
    }

    // if still nothing, try rescue: maybe someone left a nested array under "trace"
    if (!trace && Array.isArray(raw.trace) && Array.isArray(raw.trace[0])) {
        trace = raw.trace
            .flat()
            .map((pair: any) =>
                Array.isArray(pair) ? { x: pair[0], y: pair[1] } : pair
            );
    }

    // attach the cleaned trace and keep metadata
    const { xUnit, yUnit, xScale, yScale } = raw;
    const normalized = { xUnit, yUnit, xScale, yScale, trace };

    console.log('Normalized preview:', normalized.trace?.[0]); // should print {x: ..., y: ...}
    return normalized;
}




