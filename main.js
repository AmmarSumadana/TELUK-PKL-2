const map = L.map('map').setView([-7.553083, 110.197472], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 25
}).addTo(map);

// Struktur data dan urutan khusus
const config = {
  polygon: {
    path: "data/polygon/",
    files: [
      { name: "teluk.json", identitas: null },
      { name: "pl_ar.json", identitas: "KETERANGAN" },
      { name: "sungai_ar.json", identitas: "KETERANGAN" },
      { name: "bangunan.json", identitas: null }
    ]
  },
  garis: {
    path: "data/garis/",
    files: [
      { name: "jaringan_jalan.json", identitas: "KETERANGAN" },
      { name: "jembatan.json", identitas: "KETERANGAN" },
      { name: "sungai.json", identitas: "KETERANGAN" }
    ]
  },
  titik: {
    path: "data/titik/",
    files: [
      { name: "industri.json", identitas: null },
      { name: "masjid.json", identitas: null },
      { name: "pemakaman.json", identitas: null },
      { name: "tempat_menarik.json", identitas: null }
    ]
  }
};

const layerMap = new Map();
let layerCounter = 0;

function makePopup(properties) {
  return Object.entries(properties).map(([k, v]) =>
    `<strong>${k}</strong>: ${v}<br>`).join('');
}

function randomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
}

function createLegendItem(name, layerObj, groupContainer) {
  const row = document.createElement("div");
  row.className = "legend-entry d-flex align-items-center mb-1";
  row.dataset.layerId = layerObj.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = true;
  checkbox.className = "form-check-input me-2";
  checkbox.addEventListener("change", () => {
    checkbox.checked ? map.addLayer(layerObj.layer) : map.removeLayer(layerObj.layer);
    updateLayerOrder();
  });

  const colorPicker = document.createElement("input");
  colorPicker.type = "color";
  colorPicker.value = layerObj.color;
  colorPicker.className = "form-control-color mx-2";
  colorPicker.addEventListener("input", () => {
    layerObj.color = colorPicker.value;
    layerObj.layer.setStyle({
      color: layerObj.color,
      fillColor: layerObj.color
    });
  });

  const label = document.createElement("span");
  label.textContent = name;

  row.appendChild(checkbox);
  row.appendChild(colorPicker);
  row.appendChild(label);
  groupContainer.appendChild(row);
}

async function loadGeoJSON(path, fileObj, groupKey, groupContainer) {
  const { name, identitas } = fileObj;
  const res = await fetch(path + name);
  const data = await res.json();

  const grouped = {};
  if (identitas) {
    data.features.forEach(f => {
      const val = f.properties[identitas] || "Tidak Diketahui";
      if (!grouped[val]) grouped[val] = [];
      grouped[val].push(f);
    });
  } else {
    const simpleName = name.replace(".json", "").replaceAll("_", " ");
    grouped[simpleName] = data.features;
  }

  for (const [key, features] of Object.entries(grouped)) {
    const color = randomColor();
    const layer = L.geoJSON(features, {
      style: { color, fillColor: color, weight: 2 },
      pointToLayer: (f, latlng) => L.circleMarker(latlng, {
        radius: 5, color, fillColor: color, weight: 1
      }),
      onEachFeature: (f, l) => l.bindPopup(makePopup(f.properties))
    }).addTo(map);

    const id = `layer-${layerCounter++}`;
    const layerObj = { layer, color, id };
    layerMap.set(id, layerObj);
    createLegendItem(key, layerObj, groupContainer);
  }
}

async function init() {
  const legend = document.getElementById("legend-content");

  const groupOrder = ["polygon", "garis", "titik"];
  const groupLabels = { polygon: "Polygon", garis: "Garis", titik: "Titik" };
  const groups = {};

  for (const groupKey of groupOrder) {
    const wrapper = document.createElement("div");
    wrapper.className = "legend-group";
    wrapper.dataset.group = groupKey;

    const title = document.createElement("div");
    title.className = "legend-group-title";
    title.textContent = groupLabels[groupKey];
    wrapper.appendChild(title);

    const container = document.createElement("div");
    container.className = "sortable-group";
    wrapper.appendChild(container);

    legend.appendChild(wrapper);
    groups[groupKey] = container;
  }

  for (const fileObj of config.polygon.files) {
    await loadGeoJSON(config.polygon.path, fileObj, "polygon", groups.polygon);
  }
  for (const fileObj of config.garis.files) {
    await loadGeoJSON(config.garis.path, fileObj, "garis", groups.garis);
  }
  for (const fileObj of config.titik.files) {
    await loadGeoJSON(config.titik.path, fileObj, "titik", groups.titik);
  }

  const allLayers = Array.from(layerMap.values()).map(obj => obj.layer);
  const featureGroup = L.featureGroup(allLayers);
  map.fitBounds(featureGroup.getBounds());

  // Sortable per grup
  document.querySelectorAll(".sortable-group").forEach(container => {
    new Sortable(container, {
      animation: 150,
      onEnd: updateLayerOrder
    });
  });

  // Drag antar grup
  new Sortable(document.getElementById("legend-content"), {
    animation: 150,
    handle: ".legend-group-title",
    onEnd: updateLayerOrder
  });

  updateLayerOrder();
}

function updateLayerOrder() {
  const groupElems = document.querySelectorAll("#legend-content .legend-group");
  const layersByGroup = { polygon: [], garis: [], titik: [] };

  groupElems.forEach(group => {
    const groupType = group.dataset.group;
    const entries = group.querySelectorAll(".legend-entry");
    entries.forEach(entry => {
      const id = entry.dataset.layerId;
      const obj = layerMap.get(id);
      if (obj && map.hasLayer(obj.layer)) {
        layersByGroup[groupType].push(obj.layer);
      }
    });
  });

  // Urut: polygon → garis → titik
  [
    ...layersByGroup.polygon,
    ...layersByGroup.garis,
    ...layersByGroup.titik
  ].forEach(layer => layer.bringToFront());
}

init();