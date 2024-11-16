export function createColorScale(maxVotes) {
    return function(voteCount) {
        // Handle edge cases where maxVotes is 0 or undefined
        if (!maxVotes || maxVotes <= 0) {
            return 'rgb(255, 255, 255)'; // Return white for 0 max votes
        }

        // Ensure vote count is within bounds
        const normalizedVoteCount = Math.max(0, Math.min(voteCount, maxVotes));
        const ratio = normalizedVoteCount / maxVotes;

        // Define the start and end colors
        const startColor = { r: 255, g: 255, b: 255 }; // White
        const endColor = { r: 255, g: 0, b: 155 }; // Pink

        // Interpolate between the start and end colors
        const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
        const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
        const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);

        return `rgb(${r}, ${g}, ${b})`;
    };
}