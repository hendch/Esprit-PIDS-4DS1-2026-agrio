export const CROP_OPTIONS = [
  { label: "Wheat", value: "wheat" },
  { label: "Barley", value: "barley" },
  { label: "Olive", value: "olive" },
  { label: "Tomato", value: "tomato" },
  { label: "Potato", value: "potato" },
];

export function cropLabel(value?: string): string {
  const option = CROP_OPTIONS.find((crop) => crop.value === value);
  return option?.label ?? "Unassigned crop";
}
