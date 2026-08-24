# Keep agent-internal architecture outside the Agent Surface core

Agent Surface exists to make software operable by agents, so its core guidance, scaffolds, and scorecard address external contact points and observable operability outcomes. General orchestration, memory, model routing, multi-agent topology, and other internal agent architecture belong only when they directly consume or validate a surface; treating them as a peer concern would turn the project into a broad agent-building toolkit.
