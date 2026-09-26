#!/usr/bin/env python3
"""Validate and export the selected fixed dense crossword.

Development compared free-form blocked fills, 12x12 modular fills, and compact
banded fills. The selected course-only layout is frozen below so every browser
receives the same puzzle. No generation happens in the browser.
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict, deque
from pathlib import Path

VERSION = "unifi-neuroscience-2026-02"

# Statistics retained from representative complete candidates compared during
# development. Candidates with general-English filler were rejected.
CANDIDATE_COMPARISON = [
    {"design": "blocked modular A", "size": "12x12", "black_pct": 22.2, "answers": 48, "course_only": False},
    {"design": "blocked modular B", "size": "12x12", "black_pct": 22.2, "answers": 48, "course_only": False},
    {"design": "banded course-only A", "size": "19x19", "black_pct": 45.2, "answers": 65, "course_only": True},
    {"design": "banded course-only B (selected)", "size": "19x19", "black_pct": 44.3, "answers": 67, "course_only": True},
]

GRID = [
    "###ALPHA####REWARD#",
    "###I#R#R######N##N#",
    "SOURCE#MYELIN#TRIAL",
    "####U####Y##T###M#T",
    "SHAPE#EDGE#PROTOMAP",
    "#P####G#A##E#####G#",
    "RANVIER#PLATE#FOVEA",
    "###T#R###T######P##",
    "#SCALP#BODY#VESICLE",
    "##P####A#######O##E",
    "CONE#BIRTH#LEARNING",
    "N#######M##I##N####",
    "SUPPORT#STDP#CARROT",
    "#####G####T##A####R",
    "LATENCY##LIGHT#DARK",
    "####G######L###H#A#",
    "SCAFFOLD##DIET#BETA",
    "H#####G######H####I",
    "HANDLING#STRABISMUS",
]

# answer: (clue, primary source chapter)
META = {
    "AGE": ("Gestational _____ affects the efficiency of fetal learning.", "Prenatal development"),
    "AIR": ("One route, with bodily vibration, by which the maternal voice reaches the fetus.", "Prenatal development"),
    "AIS": ("Initials for the axonal compartment selectively innervated by chandelier cells.", "Circuit development"),
    "ALPHA": ("EEG band at approximately 8–13 Hz.", "Methods"),
    "ARM": ("Fetal body part whose movements can be monitored during maternal touch.", "Prenatal development"),
    "BAR": ("Edge or _____ orientation that can drive a selective V1 neuron.", "Experience"),
    "BETA": ("EEG rhythm between alpha and gamma in frequency.", "Methods"),
    "BIRTH": ("Transition across which sensory development remains continuous.", "Prenatal development"),
    "BODY": ("Fetal _____ movement is one behavioral measure available before birth.", "Prenatal development"),
    "CARROT": ("Flavor used to demonstrate memory for maternal diet after birth.", "Prenatal development"),
    "CAT": ("Animal in the classic ocular-dominance deprivation experiments.", "Experience"),
    "CNS": ("Initials for the brain-and-spinal-cord division of the nervous system.", "Nervous system development"),
    "CONE": ("Growth _____: motile structure at the tip of an extending axon.", "Circuit development"),
    "CPN": ("Initials for late-born callosal projection neurons.", "Neurogenesis"),
    "CUE": ("A growth cone can turn toward or away from this guidance signal.", "Circuit development"),
    "DARK": ("_____ rearing can delay aspects of visual critical-period maturation.", "Experience"),
    "DHB": ("Course abbreviation for deoxygenated hemoglobin in hemodynamic imaging.", "Methods"),
    "DIET": ("Maternal source of compounds that enter amniotic fluid and support flavor learning.", "Prenatal development"),
    "DNA": ("Sequence left unchanged by epigenetic regulation.", "Parental care"),
    "DTI": ("Initials for the diffusion method used to study white-matter organization.", "Methods"),
    "EDGE": ("Elongated V1 receptive fields can be selective for its orientation.", "Experience"),
    "EEG": ("Scalp method with millisecond temporal resolution.", "Methods"),
    "EGR": ("Transcription-factor abbreviation paired with NGFI-A in the maternal-care example.", "Parental care"),
    "ERP": ("Averaged, event-locked EEG response.", "Methods"),
    "EYE": ("The open one gains cortical territory after monocular deprivation.", "Experience"),
    "FOVEA": ("Retinal region with the highest visual acuity.", "Experience"),
    "GAP": ("Short temporal _____ between spikes that matters for STDP.", "Neuroplasticity"),
    "GLI": ("Transcription-factor family activated downstream of Sonic Hedgehog.", "Nervous system development"),
    "HANDLING": ("Brief neonatal manipulation contrasted with prolonged maternal separation.", "Parental care"),
    "HPA": ("Three-letter name of the stress axis shaped by early maternal care.", "Parental care"),
    "IMM": ("Chick forebrain region strongly involved in visual imprinting.", "Parental care"),
    "ION": ("Charged particle conducted through an open receptor channel.", "Neuroplasticity"),
    "LATENCY": ("ERP component measure describing when a peak occurs.", "Methods"),
    "LEARNING": ("Prenatal habituation provides a simple demonstration of this capacity.", "Prenatal development"),
    "LGN": ("Thalamic relay between retina and primary visual cortex.", "Experience"),
    "LIGHT": ("Sensory stimulus detected late in gestation but strongly attenuated in utero.", "Prenatal development"),
    "LIP": ("Dorsal _____ tissue was transplanted in the Spemann–Mangold experiment.", "Nervous system development"),
    "LTD": ("Abbreviation for persistent activity-dependent synaptic weakening.", "Neuroplasticity"),
    "LTP": ("Abbreviation for persistent activity-dependent synaptic strengthening.", "Neuroplasticity"),
    "MYELIN": ("Multilayered glial membrane enabling saltatory conduction.", "Circuit development"),
    "NGF": ("Initials of the first identified neurotrophic factor.", "Neurogenesis"),
    "NTR": ("Receptor suffix in p75_____, which can bind neurotrophins.", "Neurogenesis"),
    "PET": ("Imaging method that detects a radioactive tracer.", "Methods"),
    "PLATE": ("Neural _____: thickened ectoderm that precedes the neural tube.", "Nervous system development"),
    "PRE": ("_____ before post usually favors potentiation in the course STDP rule.", "Neuroplasticity"),
    "PROTOMAP": ("Model proposing early intrinsic regional biases in cortical progenitors.", "Nervous system development"),
    "RANVIER": ("Surname naming the sodium-channel-rich gaps between myelin segments.", "Circuit development"),
    "RAT": ("Common rodent model for maternal sensitization and care effects.", "Parental care"),
    "REWARD": ("Motivational information integrated by parental-care circuitry.", "Parental care"),
    "RGC": ("Initials for the output neuron of the retina.", "Experience"),
    "RNA": ("Molecular readout whose expression can change without altering DNA sequence.", "Parental care"),
    "SCAFFOLD": ("Radial glia provide this physical support for neuronal migration.", "Neurogenesis"),
    "SCALP": ("Surface on which EEG electrodes are placed.", "Methods"),
    "SHAPE": ("Ventral-stream attribute used in object identification.", "Experience"),
    "SHH": ("Standard abbreviation for the major ventral neural-tube morphogen.", "Nervous system development"),
    "SOURCE": ("In fNIRS, light travels from this optode to a detector.", "Methods"),
    "STDP": ("Plasticity rule based on relative spike timing.", "Neuroplasticity"),
    "STRABISMUS": ("Eye misalignment that reduces correlated binocular input.", "Experience"),
    "SUPPORT": ("Limited trophic resource supplied by target tissue to developing neurons.", "Neurogenesis"),
    "THB": ("fNIRS abbreviation for total hemoglobin.", "Methods"),
    "TMS": ("Magnetic perturbation method used to test causal cortical involvement.", "Methods"),
    "TRIAL": ("One repeated event contributing to an averaged ERP.", "Methods"),
    "TRK": ("Receptor family through which neurotrophins exert selective effects.", "Neurogenesis"),
    "VESICLE": ("Primary brain _____: forebrain, midbrain, or hindbrain.", "Nervous system development"),
    "VPC": ("Initials for the looking task comparing familiar and novel stimuli.", "Methods"),
    "VTA": ("Reward-related midbrain area receiving parental-circuit input from MPOA.", "Parental care"),
    "WNT": ("Three-letter family contributing to dorsal and posterior patterning.", "Nervous system development"),
}


def find_entries():
    height, width = len(GRID), len(GRID[0])
    assert all(len(row) == width for row in GRID)
    entries = []
    for row in range(height):
        for col in range(width):
            if GRID[row][col] == "#":
                continue
            if col == 0 or GRID[row][col - 1] == "#":
                end = col
                while end < width and GRID[row][end] != "#": end += 1
                if end - col >= 3:
                    entries.append({"answer": GRID[row][col:end], "row": row, "col": col, "direction": "across"})
            if row == 0 or GRID[row - 1][col] == "#":
                end = row
                while end < height and GRID[end][col] != "#": end += 1
                if end - row >= 3:
                    entries.append({"answer": "".join(GRID[r][col] for r in range(row, end)), "row": row, "col": col, "direction": "down"})
    return entries


def validate_and_export():
    entries = find_entries()
    answers = [entry["answer"] for entry in entries]
    assert len(entries) == 67 and len(set(answers)) == 67
    assert set(answers) == set(META), (set(answers)-set(META), set(META)-set(answers))
    assert min(map(len, answers)) >= 3
    starts = sorted({(entry["row"], entry["col"]) for entry in entries})
    numbers = {start: number for number, start in enumerate(starts, 1)}
    for entry in entries:
        entry["number"] = numbers[entry["row"], entry["col"]]
        entry["clue"], entry["chapter"] = META[entry["answer"]]
        entry["label"] = entry["answer"]
    entries.sort(key=lambda entry: (entry["number"], entry["direction"] != "across"))

    owners = defaultdict(list)
    for index, entry in enumerate(entries):
        for offset in range(len(entry["answer"])):
            cell = (entry["row"] + (entry["direction"] == "down") * offset,
                    entry["col"] + (entry["direction"] == "across") * offset)
            owners[cell].append(index)
    graph = [set() for _ in entries]
    for cell_entries in owners.values():
        for index in cell_entries: graph[index].update(set(cell_entries) - {index})
    seen = {0}; queue = deque([0])
    while queue:
        for other in graph[queue.popleft()] - seen: seen.add(other); queue.append(other)
    assert len(seen) == len(entries)

    data = {"version": VERSION, "title": "Neuroscience Across Development",
            "width": len(GRID[0]), "height": len(GRID), "grid": GRID, "entries": entries}
    target = Path(__file__).with_name("crossword-data.js")
    target.write_text("window.CROSSWORD_DATA = " + json.dumps(data, indent=2) + ";\n", encoding="utf-8")
    black = sum(row.count("#") for row in GRID); total = len(GRID) * len(GRID[0])
    stats = {
        "dimensions": f"{len(GRID[0])}x{len(GRID)}", "white": total-black, "black": black,
        "black_pct": round(black*100/total, 1), "across": sum(e["direction"]=="across" for e in entries),
        "down": sum(e["direction"]=="down" for e in entries), "answers": len(entries),
        "intersections": sum(len(value)==2 for value in owners.values()),
        "lengths": dict(sorted(Counter(map(len, answers)).items())),
        "chapters": dict(sorted(Counter(entry["chapter"] for entry in entries).items())),
        "connected": len(seen)==len(entries),
    }
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    validate_and_export()
