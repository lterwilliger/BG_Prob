const copiesPerTier = {
  1: 16,
  2: 15,
  3: 13,
  4: 11,
  5: 9,
  6: 7
};

const alwaysIncludedPool = 'All'; // Hardcoded pool value

let allMinions = [];

// Load minions from JSON file
function loadMinionsFromJSON() {
  fetch("minions.json") // Update the file path if needed
    .then(response => response.json())
    .then(data => {
      console.log("JSON Loaded:", data); // Log loaded data
      allMinions = data.data; // Assuming `data.data` holds the array of minions
      updateMinionList(); // Call to update the list after loading data
      populatePoolFilters();
    })
    .catch(error => {
      console.error("Error loading JSON file:", error.message);
    });
}

// Populate pool filters dynamically based on loaded minions
function populatePoolFilters() {
  const pools = new Set();
  allMinions.forEach(minion => {
    if (minion.isActive && !minion.isToken) { // Check if the minion is active and not a token
      minion.pools.forEach(pool => pools.add(pool));
    }
  });

  const poolFilters = document.getElementById('poolFilters');
  poolFilters.innerHTML = '';
  pools.forEach(pool => {
    if (pool !== alwaysIncludedPool) {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" class="minionPool" value="${pool}" checked> ${pool}`;
      poolFilters.appendChild(label);
    }
  });

  document.querySelectorAll('.minionPool').forEach(checkbox => {
    checkbox.addEventListener('change', updateMinionList);
  });
}

// Calculate the total deck size based on the selected Tavern Tier
function calculateTotalDeckSize(tier) {
  let totalCopies = 0;
  for (let t = 1; t <= tier; t++) {
    totalCopies += copiesPerTier[t] || 0;
  }
  return totalCopies;
}

// Get the filtered deck size based on selected pools
function getFilteredDeckSize(tier, selectedPools) {
  let totalCopies = 0;
  for (let t = 1; t <= tier; t++) {
    const tierMinions = allMinions.filter(minion => minion.tier === t && minion.pools.some(pool => selectedPools.includes(pool)));
    totalCopies += tierMinions.length * copiesPerTier[t];
  }
  return totalCopies;
}

// Calculate hypergeometric probability for drawing a certain number of minions
function calculateHypergeometricProbability(totalCards, goodCards, draws, desiredDraws) {
  const choose = (n, k) => {
    if (k < 0 || k > n) return 0;
    let result = 1;
    for (let i = 0; i < k; i++) {
      result *= (n - i) / (k - i);
    }
    return result;
  };

  return 1 - choose(goodCards, 0) * choose(totalCards - goodCards, draws) / choose(totalCards, draws);
}

// Update the displayed list of minions based on selected filters
function updateMinionList() {
  if (allMinions.length === 0) {
    console.error("Minion data not loaded yet.");
    return;
  }

  const tier = parseInt(document.getElementById('tavernTier').value);
  const minionList = document.getElementById('minionList');
  const selectedPools = Array.from(document.querySelectorAll('.minionPool:checked')).map(cb => cb.value);
  const duosOnly = document.getElementById('duosOnly').checked;
  const numberOfDraws = 3; // Number of minions drawn per turn
  minionList.innerHTML = '';

  let filteredMinions = [];

  allMinions.forEach(minion => {
    if (minion.tier <= tier && minion.isActive && !minion.isToken) {
      const minionPools = minion.pools;
      // Check if the minion should be included based on pool filters and Duos Only setting
      if (
        ((minionPools.includes(alwaysIncludedPool) && (!minion.isDuosOnly)) || selectedPools.length === 0 || selectedPools.some(pool => minionPools.includes(pool))) ||
        (duosOnly && minion.isDuosOnly)
      ) {
        filteredMinions.push(minion);
      }
    }
  });

  if (filteredMinions.length === 0) {
    minionList.innerHTML = '<p>No minions to display</p>';
    return;
  }

  const filteredDeckSize = getFilteredDeckSize(tier, selectedPools);
  // Group minions by tier
  const minionGroups = filteredMinions.reduce((groups, minion) => {
    const tierGroup = `Tier ${minion.tier}`;
    if (!groups[tierGroup]) groups[tierGroup] = [];
    groups[tierGroup].push(minion);
    return groups;
  }, {});

  // Sort tiers in descending order based on available tiers
  const sortedTiers = Object.keys(minionGroups)
    .map(key => parseInt(key.replace('Tier ', '')))
    .filter(t => t <= tier) // Only include tiers up to the current tier
    .sort((a, b) => b - a); // Sort in descending order

  sortedTiers.forEach(tierNumber => {
    const tierGroup = `Tier ${tierNumber}`;
    const tierSection = document.createElement('div');
    tierSection.classList.add('minion-tier-section');
    tierSection.innerHTML = `<h2>${tierGroup}</h2>`;
    
    const grid = document.createElement('div');
    grid.classList.add('minion-grid');
    
    minionGroups[tierGroup].forEach(minion => {
      const minionCopies = copiesPerTier[minion.tier] || 0;
      const probabilityAtLeastOnce = calculateHypergeometricProbability(filteredDeckSize, minionCopies, numberOfDraws, 1);

      const card = document.createElement('div');
      card.classList.add('minion-card');
      card.innerHTML = `
        <img src="${minion.picture}" alt="${minion.name}">
        <div class="minion-info">
          <div class="minion-name">${minion.name}</div>
          <div class="minion-probability">${(probabilityAtLeastOnce * 100).toFixed(2)}%</div>
        </div>
      `;
      grid.appendChild(card);
    });
    
    tierSection.appendChild(grid);
    minionList.appendChild(tierSection);
  });
}

// Ensure checkbox is unchecked by default
document.getElementById('duosOnly').checked = false;

// Load minions on page load
window.onload = function() {
  loadMinionsFromJSON();
};

// Add event listener for tier dropdown change
document.getElementById('tavernTier').addEventListener('change', updateMinionList);

// Add event listener for Duo-Only checkbox change
document.getElementById('duosOnly').addEventListener('change', updateMinionList);
