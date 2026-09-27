#!/usr/bin/env python3
"""Validate and export the fixed dense neuroscience crossword.

This is a development utility. The browser reads crossword-data.js and never
constructs or randomizes a grid at runtime.
"""
from __future__ import annotations
import json, re
from collections import Counter, defaultdict, deque
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
VERSION = 'unifi-neuroscience-2026-05'
GRID = ['GROWTH##ROLE##CELLS',
 '##TARGET#BODY#NOTCH',
 '#DARK##MEMORY#ALPHA',
 'AXON###SUPPORT#STDP',
 '#OPTIC##BIRTH#NERVE',
 '#AGRIN#WAVE#REGION#',
 'STRESS##RATE##FOVEA',
 'ODOR#FEEDING###NODE',
 '##SPERRY#CARE#BRAIN',
 '#LOSS#METHOD#PLATE#',
 '#TRIAL#SPIKE#ADULT#',
 'EDGE##RANVIER##CELL',
 '##CARROT#AMPA#SCALP',
 '#SPINE#FORM##SOURCE',
 '#BETA##TUBE#LATENCY',
 'FATE###VENTRAL#GENE',
 '#LAYER#NUMB#OCULAR#',
 '#VISUAL#BDNF#FNIRS#',
 '#CREST#STATE##GAMMA']

# answer: (clue, chapter)
META = {'ADULT': ('Mature stage used as a comparison point in studies of developmental plasticity.', 'Experience'),
 'AGRIN': ('Basal-lamina signal organizing postsynaptic specialization at the NMJ.', 'Circuit development'),
 'AIR': ('One route, with bodily vibration, by which the maternal voice reaches the fetus.',
         'Prenatal development'),
 'ALPHA': ('EEG band at approximately 8–13 Hz.', 'Methods'),
 'AMPA': ('Glutamate-receptor type inserted during early expression of LTP.', 'Neuroplasticity'),
 'ARM': ('Fetal body part whose movements can be monitored during maternal touch.', 'Prenatal development'),
 'AXON': ('Neuronal process led toward its target by a growth cone.', 'Circuit development'),
 'BAR': ('Edge or _____ orientation that can drive a selective V1 neuron.', 'Experience'),
 'BDNF': ('Neurotrophin linked to maturation and plasticity in visual cortex.', 'Experience'),
 'BETA': ('EEG rhythm between alpha and gamma in frequency.', 'Methods'),
 'BIRTH': ('Transition across which sensory development remains continuous.', 'Prenatal development'),
 'BMP': ('Initials of a signaling family involved in dorsal neural-tube patterning.',
         'Nervous system development'),
 'BODY': ('Fetal _____ movement is one behavioral measure available before birth.', 'Prenatal development'),
 'BRAIN': ('Organ formed from the anterior neural tube and subdivided into primary vesicles.', 'Nervous system development'),
 'CARE': ('Parental behavior quantified in studies of licking, grooming, and nursing.', 'Parental care'),
 'CARROT': ('Specific maternal-diet flavor used in the course example of prenatal memory.', 'Prenatal development'),
 'CELL': ('Basic unit whose competence changes its response to developmental signals.',
          'Nervous system development'),
 'CELLS': ('Units that acquire fates, migrate, and assemble into developing neural circuits.', 'Neurogenesis'),
 'CNS': ('Initials for the brain-and-spinal-cord division of the nervous system.', 'Nervous system development'),
 'CREST': ('Neural _____: migratory population producing diverse peripheral derivatives.',
           'Nervous system development'),
 'CUE': ('A growth cone can turn toward or away from this guidance signal.', 'Circuit development'),
 'DARK': ('Absence of visual input used in rearing studies of experience-dependent development.', 'Experience'),
 'DEEP': ('Cortical layers generated earlier than upper layers.', 'Neurogenesis'),
 'DIET': ('Maternal source of compounds that enter amniotic fluid and support flavor learning.',
          'Prenatal development'),
 'EDGE': ('Elongated V1 receptive fields can be selective for its orientation.', 'Experience'),
 'EGR': ('Transcription-factor abbreviation paired with NGFI-A in the maternal-care example.', 'Parental care'),
 'ERP': ('Averaged, event-locked EEG response, for short.', 'Methods'),
 'EYE': ('The open one gains cortical territory after monocular deprivation.', 'Experience'),
 'EYES': ('Paired sensory organs whose aligned input supports binocular cortical development.', 'Experience'),
 'FATE': ('Developmental identity adopted by a differentiating cell.', 'Neurogenesis'),
 'FEEDING': ("Source of reward that Harlow's cloth-mother results showed was insufficient to explain attachment.", 'Parental care'),
 'FNIRS': ('Optical method that estimates cortical hemodynamic responses through the scalp.', 'Methods'),
 'FORM': ('LTP is one _____ of activity-dependent synaptic plasticity.', 'Neuroplasticity'),
 'FOVEA': ('Retinal location with the highest cone density and visual acuity.', 'Experience'),
 'GAMMA': ('High-frequency EEG band discussed alongside slower rhythms.', 'Methods'),
 'GENE': ('DNA unit whose expression can be regulated by early experience without changing its sequence.',
          'Parental care'),
 'GLIA': ('Non-neuronal cells that include radial progenitors and myelinating cells.', 'Neurogenesis'),
 'GROWTH': ("First word in '_____ cone,' the motile tip of a developing axon.", 'Circuit development'),
 'IMM': ('Chick forebrain region strongly involved in visual imprinting.', 'Parental care'),
 'ION': ('Charged particle conducted through an open receptor channel.', 'Neuroplasticity'),
 'LATENCY': ('Delay from stimulus onset to a measured response.', 'Methods'),
 'LAYER': ('Cortical subdivision defined by cellular organization and connectivity.', 'Neurogenesis'),
 'LEARN': ('What fetuses demonstrate when repeated stimulation produces habituation.', 'Prenatal development'),
 'LOSS': ('Vision _____ can shift the metaplastic modification threshold.', 'Neuroplasticity'),
 'LTD': ('Abbreviation for persistent activity-dependent synaptic weakening.', 'Neuroplasticity'),
 'LTP': ('Abbreviation for persistent activity-dependent synaptic strengthening.', 'Neuroplasticity'),
 'MEMORY': ('Retention demonstrated when prenatal exposure changes newborn preference.', 'Prenatal development'),
 'METHOD': ('A defined procedure used to measure or manipulate neural activity.', 'Methods'),
 'NERVE': ('Optic _____: retinal output pathway toward central visual targets.', 'Experience'),
 'NGF': ('Initials of the first identified neurotrophic factor.', 'Neurogenesis'),
 'NMDA': ('Glutamate receptor that acts as a coincidence detector.', 'Neuroplasticity'),
 'NODE': ('_____ of Ranvier: gap supporting saltatory conduction.', 'Circuit development'),
 'NOTCH': ('Receptor central to lateral inhibition during cell-fate decisions.', 'Neurogenesis'),
 'NTR': ('Receptor suffix in p75_____, which can bind neurotrophins.', 'Neurogenesis'),
 'NUMB': ('Fate determinant distributed asymmetrically during some progenitor divisions.', 'Neurogenesis'),
 'OCULAR': ('_____ dominance: relative cortical responsiveness to the two eyes.', 'Experience'),
 'ODOR': ('Cue supporting early attachment learning and offspring recognition.', 'Parental care'),
 'OPTIC': ('_____ nerve: bundle formed by retinal ganglion-cell axons.', 'Circuit development'),
 'PET': ('Imaging method that detects a radioactive tracer.', 'Methods'),
 'PLATE': ('Cortical _____: destination layer for migrating young neurons.', 'Neurogenesis'),
 'PRE': ('_____ before post usually favors potentiation in the course STDP rule.', 'Neuroplasticity'),
 'RANVIER': ("Surname in 'nodes of _____,' the gaps between myelin segments.", 'Circuit development'),
 'RAT': ('Common rodent model for maternal sensitization and care effects.', 'Parental care'),
 'RATE': ('Neural code based on the number of spikes produced over time.', 'Neuroplasticity'),
 'REGION': ('A distinct neural-tube or cortical territory established by patterning.',
            'Nervous system development'),
 'RNA': ('Molecular readout whose expression can change without altering DNA sequence.', 'Parental care'),
 'ROLE': ('Glia have an active _____ in synapse formation, not merely support.', 'Circuit development'),
 'SCALP': ('Surface on which EEG electrodes are placed.', 'Methods'),
 'SHAPE': ('Ventral-stream attribute used in object identification.', 'Experience'),
 'SOURCE': ('In fNIRS, light travels from this optode to a detector.', 'Methods'),
 'SPERRY': ('Surname associated with the chemoaffinity hypothesis of neural mapping.', 'Circuit development'),
 'SPIKE': ('Brief electrical event whose timing can determine synaptic change.', 'Neuroplasticity'),
 'SPINE': ('Dendritic protrusion whose turnover can reflect structural plasticity.', 'Neuroplasticity'),
 'STATE': ('Neural _____: overall condition that can change a measured response.', 'Methods'),
 'STDP': ('Plasticity rule based on relative spike timing.', 'Neuroplasticity'),
 'STRESS': ('Physiological system whose later regulation is shaped by early maternal care.', 'Parental care'),
 'SUPPORT': ('Limited trophic resource supplied by target tissue to developing neurons.', 'Neurogenesis'),
 'TARGET': ('Structure reached by a developing axon and competing for its innervation.', 'Circuit development'),
 'TMS': ('Magnetic perturbation method used to test causal cortical involvement.', 'Methods'),
 'TRIAL': ('Single repeated stimulus presentation included when averaging an ERP.', 'Methods'),
 'TRK': ('Receptor family through which neurotrophins exert selective effects.', 'Neurogenesis'),
 'TUBE': ('Neural _____: embryonic precursor of the central nervous system.', 'Nervous system development'),
 'VENTRAL': ('Neural-tube side patterned by Sonic Hedgehog.', 'Nervous system development'),
 'VISUAL': ('Pertaining to the sensory system shaped by ocular experience.', 'Experience'),
 'WAVE': ('Spontaneous retinal activity pattern that helps organize visual connections.', 'Experience')}

DOWN = [('LEARN', 10, 16),
 ('SHAPE', 0, 18),
 ('EYES', 7, 7),
 ('DEEP', 9, 11),
 ('GLIA', 15, 15),
 ('DIET', 7, 17),
 ('AIR', 16, 2),
 ('CNS', 4, 5),
 ('RAT', 16, 5),
 ('TMS', 1, 7),
 ('NGF', 4, 14),
 ('CUE', 12, 15),
 ('LTP', 0, 16),
 ('ARM', 16, 16),
 ('NMDA', 15, 9),
 ('NTR', 3, 3),
 ('ERP', 6, 3),
 ('TRK', 0, 4),
 ('RNA', 12, 4),
 ('BMP', 1, 9),
 ('PRE', 3, 10),
 ('ION', 5, 15),
 ('LTD', 9, 1),
 ('PET', 13, 2),
 ('BAR', 4, 8),
 ('IMM', 11, 10),
 ('EGR', 6, 11),
 ('EYE', 13, 18)]

CHAPTER_FILES = {
    "Nervous system development": "1_ns_development.qmd",
    "Neurogenesis": "2_neurogenesis.qmd",
    "Circuit development": "3_circuit_development.qmd",
    "Methods": "4_methods.qmd",
    "Neuroplasticity": "5_neuroplasticity.qmd",
    "Experience": "6_experience.qmd",
    "Parental care": "7_parental_care.qmd",
    "Prenatal development": "8_prenatal.qmd",
}

STOP = set("""about above after again against almost along already also although among another around because before below between both could during each either enough every following generally however important including itself later many might more most much must other rather should since some still such than that their them then there these they this those through together toward under using very were what when where which while whose within without would your iframe ncol pubmed http https figure image video slide title column""".upper().split())


def across_entries():
    result = []
    for row, line in enumerate(GRID):
        for match in re.finditer(r"[A-Z]+", line):
            result.append((match.group(), row, match.start(), "across"))
    return result


def build_entries():
    raw = across_entries() + [(answer, row, col, "down") for answer, row, col in DOWN]
    starts = sorted({(row, col) for _, row, col, _ in raw})
    number = {cell: i + 1 for i, cell in enumerate(starts)}
    entries = []
    for answer, row, col, direction in sorted(raw, key=lambda x: (x[1], x[2], x[3] == "down")):
        clue, chapter = META[answer]
        entries.append({
            "answer": answer, "row": row, "col": col, "direction": direction,
            "number": number[(row, col)], "clue": clue, "chapter": chapter, "label": answer,
        })
    return entries


def cells_for(entry):
    return [(entry["row"] + (entry["direction"] == "down") * i,
             entry["col"] + (entry["direction"] == "across") * i)
            for i in range(len(entry["answer"]))]


def validate(entries):
    assert len(GRID) == 19 and all(len(row) == 19 for row in GRID)
    assert len(entries) == 85 and len({(e["answer"], e["direction"]) for e in entries}) == 85
    letters = {}
    for entry in entries:
        assert entry["answer"] in META and len(entry["answer"]) >= 3
        for cell, letter in zip(cells_for(entry), entry["answer"]):
            r, c = cell
            assert GRID[r][c] != "#" and GRID[r][c] == letter
            assert letters.get(cell, letter) == letter
            letters[cell] = letter
    whites = {(r, c) for r, row in enumerate(GRID) for c, value in enumerate(row) if value != "#"}
    assert whites == set(letters), "Every playable cell must belong to an answer."
    seen = {next(iter(whites))}; queue = deque(seen)
    while queue:
        r, c = queue.popleft()
        for nxt in ((r-1,c),(r+1,c),(r,c-1),(r,c+1)):
            if nxt in whites and nxt not in seen: seen.add(nxt); queue.append(nxt)
    assert seen == whites, "Playable cells must form one connected component."
    return whites


def candidate_vocabulary():
    manual = set(META) | set("""ZYGOTE ECTODERM MESODERM ENDODERM NEURAL TUBE ORGANIZER INDUCTION BMP VENTRAL MORPHOGEN COMPETENCE VESICLE FGF RETINOIC HOX PROTOMAP CORTEX GRADIENT SPINAL PROGENITOR SYMMETRIC ASYMMETRIC RADIAL VENTRICULAR CORTICAL BIRTHDATE TRANSPLANT MIGRATION APOPTOSIS NECROSIS TARGET SURVIVAL TROPHIC COMPETITION DIVISION SCAFFOLD GUIDANCE SPERRY TOPOGRAPHIC EPH NETRIN ADHESION FASCICLE DIFFUSIBLE RECEPTOR REFINEMENT RANVIER CIRCUIT CONTACT ORIENTING EXPECTANCY HABITUATION SUCKING EEG MEG FMRI FNIRS DETECTOR ACUITY LOOKING RESPONSE METHOD MEASURE BEHAVIOR IMAGING MAGNETIC HEBB TIMING SPIKE STDP CONSOLIDATION STRUCTURAL HOMEOSTATIC METAPLASTIC MOTOR PRACTICE POTENTIATION SYNAPTIC PLASTICITY STABILITY LEARNING MEMORY STRENGTH RETINA VISION BINOCULAR RECEPTIVE FIELD CONTRAST MONOCULAR CATARACT AMBLYOPIA WIESEL OCULAR DOMINANCE DEPRIVATION STRABISMUS INHIBITION BDNF BRAKE PERIOD CRITICAL LIGHT PARENT ATTACHMENT HARLOW COMFORT CAREGIVER IMPRINTING MOTHER MATERNAL METHYLATION HISTONE HANDLING SEPARATION EPIGENETIC FOSTERING REWARD OFFSPRING FETAL MOVEMENT TASTE FLAVOR ACOUSTIC AUDITORY GESTATION COGNITION PRENATAL POSTNATAL ABDOMEN SENSORY BIRTH""".split())
    chapters_for = defaultdict(set); counts = Counter()
    for chapter, filename in CHAPTER_FILES.items():
        text = (ROOT / filename).read_text(encoding="utf-8")
        text = re.sub(r"```.*?```|https?://\S+|<[^>]+>", " ", text, flags=re.S)
        chapter_words = Counter(w.upper() for w in re.findall(r"[A-Za-z]+", text))
        for word, count in chapter_words.items():
            if 3 <= len(word) <= 12 and word not in STOP:
                chapters_for[word].add(chapter); counts[word] += count
    # Manual concepts first, followed by recurring context words actually used in the chapters.
    ranked = sorted((w for w in chapters_for if counts[w] >= 2), key=lambda w: (-counts[w], w))
    selected = list(sorted(manual))
    for word in ranked:
        if word not in manual and word.isalpha(): selected.append(word)
        if len(selected) >= 360: break
    records = []
    for word in selected:
        records.append({
            "answer": word,
            "chapters": sorted(chapters_for.get(word, [])),
            "sourceOccurrences": counts.get(word, 0),
            "selectedForFinal": word in META,
        })
    return records


def main():
    entries = build_entries(); whites = validate(entries)
    data = {"version": VERSION, "title": "Neuroscience Across Development", "width": 19, "height": 19,
            "grid": GRID, "entries": entries}
    (HERE / "crossword-data.js").write_text("window.CROSSWORD_DATA = " + json.dumps(data, indent=2) + ";\n", encoding="utf-8")
    vocab = candidate_vocabulary()
    (HERE / "candidate-vocabulary.json").write_text(json.dumps(vocab, indent=2) + "\n", encoding="utf-8")
    counts = Counter(len(e["answer"]) for e in entries)
    crossed = Counter(cell for e in entries for cell in cells_for(e))
    black = 19 * 19 - len(whites)
    summary = {
        "dimensions": "19x19", "whiteCells": len(whites), "blackCells": black,
        "blackPercentage": round(100 * black / 361, 1), "answers": len(entries),
        "across": sum(e["direction"] == "across" for e in entries),
        "down": sum(e["direction"] == "down" for e in entries),
        "intersections": sum(v == 2 for v in crossed.values()),
        "crossedPlayablePercentage": round(100 * sum(v == 2 for v in crossed.values()) / len(whites), 1),
        "lengthHistogram": dict(sorted(counts.items())),
        "threeLetterAnswers": counts[3],
        "candidateVocabulary": len(vocab),
    }
    print(json.dumps(summary, indent=2))
    print("\n".join("".join("#" if ch == "#" else "." for ch in row) for row in GRID))

if __name__ == "__main__":
    main()
