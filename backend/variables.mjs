let recachingCurrent = 0;
let recachingTotal = 0;
let factor = 0;

/**
 * Reset module variables for recaching process. They will be used to calculate the progress and print to stdout.
 *
 * @param {string[]} pdfList
 *
 * @returns void
 */
export function resetCacheValues(pdfList) {
    recachingTotal = pdfList.length;
    recachingCurrent = 0;
    factor = 0;
}

export function incrementRecachingCurrent() {
    recachingCurrent++;
}

export function getRecachingCurrent() {
    return recachingCurrent;
}

export function getRecachingTotal() {
    return recachingTotal;
}

export function getFactor() {
    return factor;
}

/**
 * Add a value to the factor.
 *
 * @param {number} value
 * @returns void
 */
export function addToFactor(value) {
    factor += value;
}