/* UTILITY FUNCTIONS */

/**
 * @typedef {Object} ComputedMapNode
 * @property {string} id
 * @property {ComputedMapNode} parent
 * @property {Array} children
 * @property {Map} edges
 */


/* MUTABLE TREE HEIRARCHY UTILITY FUNCTIONS */

/**
  *
  * @param {ComputedMapNode} node
  * @returns {string}
  *
  * @description
  * The edge with the largest counter is considered to be the most recent one.
  * If two edges are set simultaneously, the identifier breaks the tie.
  */
export function edgeWithLargestCounter(node) {
    let edgeID = null;
    let largestCounter = -1;
    for (const [id, counter] of node.edges.entries()) {
        if (
            counter > largestCounter ||
            (counter === largestCounter && id > edgeID)
        ) {
            edgeID = id;
            largestCounter = counter;
        }
    }
    return edgeID;
}



/* ORDER UTILITY FUNCTIONS */

/**
 * 
 * @param {string} before 
 * @param {string} after 
 * @returns {string}
 * @description https://madebyevan.com/algos/crdt-fractional-indexing/
 * TODO: Look into allowing logarithimic key growth for generating an appending or prepending order index
 */
export function insertBetween(before, after) {

    const minDigit = "\u0000".charCodeAt(0);
    const maxDigit = "\u00FF".charCodeAt(0);

    let foundDifference = false;
    let result = "";
    let i = 0;

    while (true) {
        const digitBefore = i < before.length ? before.charCodeAt(i) : minDigit;
        const digitAfter =
            !foundDifference && i < after.length ? after.charCodeAt(i) : maxDigit + 1;

        const pick = (digitBefore + digitAfter) >>> 1;
        result += String.fromCharCode(pick);

        if (pick <= digitBefore) {
            if (digitBefore < digitAfter) {
                foundDifference = true;
            }

            i += 1;
            continue;
        }

        let jitter = Math.floor(Math.random() * 0x1000);
        while (jitter > 0) {
            const base = maxDigit - minDigit + 1;
            const mod = jitter % base;
            jitter = (jitter - mod) / base;
            result += String.fromCharCode(minDigit + mod);
        }

        return result;
    }
}