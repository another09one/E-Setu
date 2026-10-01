// Demo AI layer. Replace classifyEwaste() with a call to your trained model/API.
// The output shape is intentionally stable so the UI does not need to change.

const classes = {
  pcb: { label:"PCB / Circuit Board", min:140, max:190 },
  cable: { label:"Copper Cable", min:110, max:155 },
  battery: { label:"Battery", min:80, max:125 },
  lcd: { label:"LCD / Display", min:45, max:80 },
  motor: { label:"Motor", min:90, max:140 },
  mixed_plastic: { label:"Mixed Plastic", min:20, max:40 },
  crt: { label:"CRT", min:15, max:35 }
};

export async function classifyEwaste(file, manualCategory="") {
  if (manualCategory && classes[manualCategory]) {
    return { category:manualCategory, ...classes[manualCategory], confidence:0.99, source:"manual" };
  }
  const name = (file?.name || "").toLowerCase();
  const key = Object.keys(classes).find(k => name.includes(k));
  const chosen = key || "pcb";
  await new Promise(r => setTimeout(r, 500));
  return { category:chosen, ...classes[chosen], confidence:key ? 0.93 : 0.72, source:"demo-ai" };
}

export function estimateValue(weightKg, result) {
  const w = Number(weightKg) || 0;
  return {
    low: Math.round(w * result.min),
    high: Math.round(w * result.max)
  };
}

export function categoryLabel(key) { return classes[key]?.label || key; }
export { classes };
