function firstNonEmpty(...vals){
  return vals.find(v => typeof v === 'string' && v.trim().length > 0) || '';
}

const map = L.map('map').setView([48.2, -3.0], 8);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  subdomains: 'abcd',
  minZoom: 6,
  maxZoom: 18
}).addTo(map);

const markersLayer = L.layerGroup().addTo(map);

const selectGare = document.getElementById('gare');
const btnValider = document.getElementById('valider');
const impactEl   = document.getElementById('impact');
const villeTitle = document.getElementById('ville');
const descEl     = document.getElementById('description');

const nearbyEl   = document.getElementById('nearby-grid') || document.getElementById('liste-lieux');
let villes = [];
let markerByName = new Map();
let currentTooltipMarker = null; 
let accesCircle = null;          

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (x) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

fetch('data/villes_bretagne.json')
  .then(res => { if (!res.ok) throw new Error('Erreur HTTP ' + res.status); return res.json(); })
  .then(data => {
    villes = data;

    if (selectGare) {
      selectGare.innerHTML = '<option value="" disabled selected>— Sélectionner —</option>';
      villes.forEach((ville, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = ville.nom;
        selectGare.appendChild(opt);
      });
    }

    villes.forEach(ville => {
      const marker = L.circleMarker([ville.lat, ville.lon], {
        radius: 7,
        fillColor: '#8A9386', 
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95
      }).addTo(markersLayer);

      marker.on('mouseover', function () { this.setStyle({ radius: 9 }); });
      marker.on('mouseout',  function () { this.setStyle({ radius: 7 }); });

      marker.on('click', () => selectCity(ville, marker));

      markerByName.set(ville.nom, marker);
    });

    // sélection via bouton
    if (btnValider && selectGare) {
      btnValider.addEventListener('click', () => {
        const idx = parseInt(selectGare.value, 10);
        if (isNaN(idx) || !villes[idx]) {
          alert('Veuillez choisir une gare valide.');
          return;
        }
        const v = villes[idx];
        const m = markerByName.get(v.nom);
        selectCity(v, m);
      });
    }
  })
  .catch(err => {
    console.error('Erreur lors du chargement du JSON :', err);
    alert('Impossible de charger les données des villes. Vérifie data/villes_bretagne.json');
  });


function selectCity(ville, marker) {
  if (!ville) return;
villeTitle.textContent = `Gare de la Ville de ${ville.nom}`;

const desc = firstNonEmpty(
  ville.description,
  ville.desc,
  ville.resume,
  ville.résumé,          
  ville.presentation,
  ville.texte,
  ville.texteCourt,
  ville.apercu,
  ville.apercu_court
);

descEl.textContent = desc || '';

impactEl.textContent = ville.impact || "Voyager en train, c’est réduire l’empreinte carbone 🌿";

  map.setView([ville.lat, ville.lon], 10);

  if (currentTooltipMarker) currentTooltipMarker.unbindTooltip();

  if (marker) {
    marker.bindTooltip(ville.nom, {
      permanent: true,
      direction: 'top',
      offset: [0, -10],
      className: 'city-label'
    }).openTooltip();
    currentTooltipMarker = marker;
  }

  const proches = villes
    .filter(v => v.nom !== ville.nom)
    .map(v => ({ ...v, d: distanceKm(ville.lat, ville.lon, v.lat, v.lon) }))
    .sort((a,b) => a.d - b.d)
    .slice(0, 4);

  renderNearby(proches);
}

function renderNearby(list) {
  if (!nearbyEl) return;
  nearbyEl.innerHTML = '';

  list.forEach(v => {
    const childTag = nearbyEl.tagName === 'UL' ? 'li' : 'div';
    const card = document.createElement(childTag);
    card.className = 'place-card';
    card.innerHTML = `
      <div style="display:flex; flex-direction:column;">
        <span style="font-weight:700;">${v.nom}</span>
        <span style="opacity:.75; font-size:.9rem;">${v.d.toFixed(1)} km</span>
      </div>
    `;
    card.addEventListener('click', () => {
      const m = markerByName.get(v.nom);
      selectCity(v, m);
    });
    nearbyEl.appendChild(card);
  });
}

fetch("data/data_graphique.json")
  .then(res => res.json())
  .then(data => {
    const bzh = data.bretagne;

    const selectTrajet = document.getElementById("trajet");
    if (selectTrajet) {
      selectTrajet.innerHTML = "";
      Object.keys(bzh.trajets_exemples).forEach(nomTrajet => {
        const opt = document.createElement("option");
        opt.value = nomTrajet;
        opt.textContent = nomTrajet;
        selectTrajet.appendChild(opt);
      });
    }

    const cClair = "#A0AE9E"; 
    const cFonce = "#5F6A60"; 
    const grid   = "#CBD5D1"; 
    const border = "#E5E7EB"; 

    const commonOpts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#111",
          titleColor: "#fff",
          bodyColor: "#fff",
          padding: 10
        }
      },
      layout: { padding: { left: 12, right: 12, top: 8, bottom: 8 } },
      scales: {
        x: {
          ticks: { color: "#111", font: { family: "Jost" } },
          grid: { color: grid, drawBorder: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#111",
            font: { family: "Jost" },
            callback: (v) => v.toLocaleString("fr-FR")
          },
          grid: { color: grid, drawBorder: false }
        }
      }
    };

    const ctxCO2 = document.getElementById("co2Chart").getContext("2d");
    const co2Chart = new Chart(ctxCO2, {
      type: "bar",
      data: {
        labels: ["Train", "Voiture"],
        datasets: [{
          data: [0, 0],
          backgroundColor: [cClair, cFonce],
          borderRadius: 8
        }]
      },
      options: {
        ...commonOpts,
        plugins: {
          ...commonOpts.plugins,
          title: {
            display: true,
            text: "Comparaison des émissions selon le trajet choisi",
            color: "#111",
            font: { family: "Jost", size: 18, weight: 700 }
          }
        },
        scales: {
          ...commonOpts.scales,
          y: {
            ...commonOpts.scales.y,
            title: { display: true, text: "g CO₂", color: "#111", font: { family: "Jost", weight: 600 } }
          }
        }
      }
    });

    const ctxDist = document.getElementById("distanceChart").getContext("2d");
    const distanceChart = new Chart(ctxDist, {
      type: "bar",
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: cFonce,
          borderRadius: 8
        }]
      },
      options: {
        ...commonOpts,
        plugins: {
          ...commonOpts.plugins,
          title: {
            display: true,
            text: "Distance moyenne accessible selon le trajet",
            color: "#111",
            font: { family: "Jost", size: 18, weight: 700 }
          },
          tooltip: {
            ...commonOpts.plugins.tooltip,
            callbacks: {
              label: (ctx) => `${ctx.label} : ${ctx.raw.toLocaleString("fr-FR")} km accessibles en moyenne`
            }
          }
        },
        scales: {
          ...commonOpts.scales,
          y: {
            ...commonOpts.scales.y,
            title: { display: true, text: "Distance (km)", color: "#111", font: { family: "Jost", weight: 600 } }
          }
        }
      }
    });

    function majGraphique(trajetNom) {
      const distance = bzh.trajets_exemples[trajetNom];
      const trainCO2 = distance * bzh.facteurs_emission.train;
      const voitureCO2 = distance * bzh.facteurs_emission.voiture;

      co2Chart.data.datasets[0].data = [Math.round(trainCO2), Math.round(voitureCO2)];
      co2Chart.update();

      distanceChart.data.labels = [trajetNom];
      distanceChart.data.datasets[0].data = [Math.round(distance)];
      distanceChart.update();
    }

    const premier = Object.keys(bzh.trajets_exemples)[0];
    majGraphique(premier);
    if (selectTrajet) {
      selectTrajet.value = premier;
      selectTrajet.addEventListener("change", (e) => majGraphique(e.target.value));
    }
  })
  .catch(err => console.error("Erreur chargement data_graphique.json :", err));

fetch("data/data_tourisme.json")
  .then(res => res.json())
  .then(data => {
    const bzh = data.bretagne;
    new Chart(document.getElementById("tourismeChart"), {
      type: "pie",
      data: {
        labels: Object.keys(bzh.tourisme_ferroviaire),
        datasets: [{
          data: Object.values(bzh.tourisme_ferroviaire),
          backgroundColor: ["#5F6A60", "#7C877C", "#A0AE9E", "#C8D1C7"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { font: { family: "Jost" } } },
          title: {
            display: true,
            text: "Répartition du tourisme ferroviaire par département",
            color: "#111",
            font: { family: "Jost", size: 18, weight: 700 }
          }
        }
      }
    });
  })
  .catch(err => console.error("Erreur chargement data_tourisme.json :", err));