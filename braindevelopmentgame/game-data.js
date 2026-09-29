/* Biological content is kept here so stages, effects, and events are easy to revise. */
window.BRAIN_GAME_DATA = {
  version: 1,
  initialState: {
    energy: 72,
    neurons: 18,
    connectivity: 8,
    plasticity: 78,
    stability: 50
  },
  variables: [
    { id: "energy", label: "Energy", color: "#c98b2e" },
    { id: "neurons", label: "Neurons", color: "#457b9d" },
    { id: "connectivity", label: "Connectivity", color: "#176b68" },
    { id: "plasticity", label: "Plasticity", color: "#7b61a8" },
    { id: "stability", label: "Stability", color: "#4f7d55" }
  ],
  stages: [
    {
      id: "induction",
      name: "Neural induction",
      shortName: "Induction",
      period: "Early neural development",
      description: "Signals establish neural identity while tissue shape and regional pattern begin to emerge.",
      visualNote: "Early signals establish neural identity and organize the neural plate.",
      budget: 5,
      processes: [
        { id: "neural-fate", name: "Neural fate signals", description: "Support neural identity in competent ectoderm.", effects: { neurons: 2, plasticity: 1 } },
        { id: "tissue-shaping", name: "Tissue shaping", description: "Coordinate bending and neural-tube organization.", effects: { stability: 3, energy: -1 } },
        { id: "regional-pattern", name: "Regional patterning", description: "Begin organizing distinct neural-tube identities.", effects: { connectivity: 1, stability: 2 } }
      ],
      events: []
    },
    {
      id: "neurogenesis",
      name: "Neurogenesis",
      shortName: "Neurogenesis",
      period: "Progenitor expansion",
      description: "Progenitors expand, generate neurons, acquire identities, and compete for survival support.",
      visualNote: "New neurons appear, but production must remain coordinated with differentiation and survival.",
      budget: 5,
      processes: [
        { id: "proliferation", name: "Proliferation", description: "Expand the progenitor population and generate more neurons.", effects: { neurons: 7, energy: -2, plasticity: 1 } },
        { id: "differentiation", name: "Differentiation", description: "Move cells toward specialized neuronal identities.", effects: { neurons: 2, connectivity: 1, stability: 2, plasticity: -1 } },
        { id: "survival", name: "Survival support", description: "Support selective neuronal survival with trophic signals.", effects: { neurons: 3, stability: 3, energy: -1 } }
      ],
      events: ["trophic-shortage", "nutrient-shortage"]
    },
    {
      id: "migration",
      name: "Neuronal migration",
      shortName: "Migration",
      period: "Cortical organization",
      description: "New neurons leave proliferative zones and reach appropriate positions in the developing tissue.",
      visualNote: "Many cortical neurons use radial glial processes as scaffolds while moving toward the cortical plate.",
      budget: 5,
      processes: [
        { id: "radial-scaffold", name: "Radial glial scaffold", description: "Maintain routes that support outward neuronal migration.", effects: { stability: 3, connectivity: 1, energy: -1 } },
        { id: "migration-cues", name: "Migration cues", description: "Coordinate timing and final position in the cortical wall.", effects: { connectivity: 3, stability: 2 } },
        { id: "cell-identity", name: "Cell identity", description: "Consolidate differentiated fates as cells settle.", effects: { neurons: 2, stability: 1, plasticity: -1 } }
      ],
      events: ["prenatal-stress"]
    },
    {
      id: "circuit-formation",
      name: "Circuit formation",
      shortName: "Circuits",
      period: "Initial wiring",
      description: "Axons navigate through local cues, recognize targets, and assemble early synaptic contacts.",
      visualNote: "Growth cones extend axons; guidance and target recognition determine which early connections stabilize.",
      budget: 5,
      processes: [
        { id: "axon-growth", name: "Axon growth", description: "Extend axons toward distant target regions.", effects: { connectivity: 5, energy: -1, plasticity: 1 } },
        { id: "guidance", name: "Axon guidance", description: "Use environmental signals to improve targeting.", effects: { connectivity: 2, stability: 4 } },
        { id: "synaptogenesis", name: "Synaptogenesis", description: "Coordinate pre- and postsynaptic specialization.", effects: { connectivity: 4, stability: 1, energy: -1 } }
      ],
      events: ["guidance-noise", "excess-growth"]
    },
    {
      id: "refinement",
      name: "Synaptic refinement",
      shortName: "Refinement",
      period: "Activity-dependent selection",
      description: "Activity helps stabilize useful contacts while competing branches and excess synapses are eliminated.",
      visualNote: "Constructive and regressive processes work together: some contacts strengthen while others retract.",
      budget: 5,
      processes: [
        { id: "patterned-activity", name: "Patterned activity", description: "Provide correlated activity that identifies useful connections.", effects: { connectivity: 4, plasticity: 2, energy: -1 } },
        { id: "stabilization", name: "Contact stabilization", description: "Strengthen selected inputs and consolidate functional contacts.", effects: { connectivity: 2, stability: 4, plasticity: -1 } },
        { id: "pruning", name: "Synaptic pruning", description: "Remove excess or poorly coordinated contacts.", effects: { stability: 4, connectivity: -1, plasticity: -1 } }
      ],
      events: ["excess-excitation"]
    },
    {
      id: "experience",
      name: "Experience & critical period",
      shortName: "Experience",
      period: "Experience-dependent maturation",
      description: "Experience refines and calibrates circuits while inhibition and myelination support maturation.",
      visualNote: "During a critical period, patterned experience has strong effects; maturation gradually increases stability.",
      budget: 5,
      processes: [
        { id: "sensory-input", name: "Patterned sensory input", description: "Refine circuits for the structure of the sensory environment.", effects: { connectivity: 4, plasticity: -1, energy: -1 } },
        { id: "inhibition", name: "Inhibitory maturation", description: "Develop a balanced excitatory–inhibitory circuit state.", effects: { stability: 5, plasticity: -3 } },
        { id: "myelination", name: "Myelination", description: "Improve the speed and reliability of axonal conduction.", effects: { connectivity: 2, stability: 4, plasticity: -2, energy: -1 } }
      ],
      events: ["reduced-stimulation", "altered-inhibition"]
    }
  ],
  events: {
    "trophic-shortage": {
      title: "Reduced trophic support",
      description: "Some developing neurons receive insufficient target-derived survival signals.",
      choices: [
        { label: "Support vulnerable neurons", note: "Costs energy but preserves more of the population.", effects: { energy: -8, neurons: 5, stability: 2 } },
        { label: "Allow selective loss", note: "Saves energy, but fewer neurons are retained.", effects: { neurons: -6, stability: 1, energy: 2 } }
      ]
    },
    "nutrient-shortage": {
      title: "Nutrient shortage",
      description: "Metabolic resources are temporarily limited during rapid cell production.",
      choices: [
        { label: "Slow proliferation", note: "Protects stability while reducing neuronal expansion.", effects: { neurons: -3, stability: 4, energy: 3 } },
        { label: "Maintain rapid production", note: "Retains growth but consumes reserves.", effects: { neurons: 3, energy: -10, stability: -2 } }
      ]
    },
    "prenatal-stress": {
      title: "Prenatal stress",
      description: "The developmental environment becomes less supportive while neurons are migrating.",
      choices: [
        { label: "Prioritize scaffold maintenance", note: "Uses energy to preserve orderly migration.", effects: { energy: -7, stability: 5 } },
        { label: "Conserve metabolic reserves", note: "Preserves energy but makes organization less reliable.", effects: { energy: 3, stability: -5, connectivity: -2 } }
      ]
    },
    "guidance-noise": {
      title: "Noisy guidance environment",
      description: "Growth cones encounter inconsistent directional information on the way to their targets.",
      choices: [
        { label: "Strengthen guidance cues", note: "Improves targeting at an energetic cost.", effects: { energy: -6, connectivity: 3, stability: 4 } },
        { label: "Favor exploratory growth", note: "Adds connections, including more poorly targeted ones.", effects: { connectivity: 6, stability: -5 } }
      ]
    },
    "excess-growth": {
      title: "Excess axonal branching",
      description: "Axons produce more branches than can be reliably stabilized.",
      choices: [
        { label: "Stabilize selected branches", note: "Keeps fewer but better organized contacts.", effects: { connectivity: 1, stability: 5, energy: -4 } },
        { label: "Retain broad branching", note: "Raises connectivity while reducing network stability.", effects: { connectivity: 6, stability: -5 } }
      ]
    },
    "excess-excitation": {
      title: "Excessive excitation",
      description: "Activity-dependent strengthening begins to push network activity outside a functional range.",
      choices: [
        { label: "Recruit homeostatic regulation", note: "Restores a functional range and limits runaway strengthening.", effects: { stability: 7, connectivity: -2, plasticity: -2 } },
        { label: "Preserve strong excitation", note: "Keeps rapid strengthening but risks instability.", effects: { connectivity: 5, stability: -8, plasticity: 2 } }
      ]
    },
    "reduced-stimulation": {
      title: "Reduced sensory stimulation",
      description: "Patterned sensory input is limited during a period of high developmental plasticity.",
      choices: [
        { label: "Restore patterned input", note: "Uses energy to support experience-dependent refinement.", effects: { energy: -5, connectivity: 5, plasticity: -2 } },
        { label: "Continue with limited input", note: "The circuit remains plastic but less fully refined.", effects: { connectivity: -6, plasticity: 4, stability: -2 } }
      ]
    },
    "altered-inhibition": {
      title: "Delayed inhibitory maturation",
      description: "The excitatory–inhibitory circuit state is not yet ready to stabilize normally.",
      choices: [
        { label: "Support inhibitory maturation", note: "Promotes a stable critical-period transition.", effects: { energy: -5, stability: 7, plasticity: -4 } },
        { label: "Extend the plastic state", note: "Preserves flexibility but delays stabilization.", effects: { plasticity: 6, stability: -6 } }
      ]
    }
  }
};
