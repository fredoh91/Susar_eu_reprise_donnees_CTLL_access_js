class MedicParser {
    constructor() {
        this.prodSub = null;
        this.dataMedic = null;
    }

    splitInput(input) {
        const pattern = /\s*\((S|I|C|N)\s*-\s*/;
        const match = input.match(pattern);

        if (match) {
            const splitPos = match.index;
            this.prodSub = input.slice(0, splitPos).trim();
            this.dataMedic = input.slice(splitPos).trim();
        } else {
            this.prodSub = null;
            this.dataMedic = null;
        }
    }

    parseProduitSubstance() {
        if (this.prodSub === null) {
            return null;
        }

        const pattern = /^(?<produit>.+?)(?:\s+\[(?<substance>.+?)\])?$/;
        const match = this.prodSub.match(pattern);

        if (match && match.groups) {
            return {
                produit: match.groups.produit.trim(),
                substance: match.groups.substance ? match.groups.substance.trim() : null,
            };
        }

        return null;
    }

    parseDataMedic() {
        if (this.dataMedic === null) {
            return null;
        }

        let input = this.dataMedic.trim();
        input = input.replace(/^\(|\)$/g, '').trim();

        const parts = input.split(' - [');
        if (parts.length !== 2) {
            return null;
        }

        const part1 = parts[0];
        const part2 = parts[1];

        const subParts1 = part1.split(' - ');
        if (subParts1.length !== 3) {
            return null;
        }

        const drugChar = subParts1[0].trim();
        const indicationPt = subParts1[1].trim();
        const actionTaken = subParts1[2].trim();

        const subParts2 = part2.replace(/\]$/, '').split(' - ');

        if (subParts2.length < 4) {
            return null;
        }

        const startDate = subParts2[0].trim();
        const duration = subParts2[1].trim();
        const dose = subParts2[2].trim();
        const route = subParts2[3].trim();
        const comment = subParts2[4] ? subParts2[4].trim() : null;

        return {
            drug_char: drugChar,
            indication_pt: indicationPt,
            action_taken: actionTaken,
            start_date: startDate,
            duration: duration,
            dose: dose,
            route: route,
            comment: comment,
        };
    }

    parseMedicCtll(input) {

        // Supprimer une virgule à la fin de la chaîne, si elle existe
        input = input.trim().replace(/,$/, '');

        this.splitInput(input);

        const produitSubstance = this.parseProduitSubstance();
        const dataMedic = this.parseDataMedic();

        if (produitSubstance !== null && dataMedic !== null) {
            return { ...produitSubstance, ...dataMedic };
        } else {
            return null;
        }
    }
}

export default MedicParser;