import { interpolate, type Interpolator } from "flubber";

export interface FoodShape {
  name: string;
  // Fruit and vegetables burst out of the Recap's "Generate My Week" button.
  kind: "plant" | "other";
  path: string;
}

// Single closed outlines (24x24) so flubber can morph each into the next.
export const FOOD_SHAPES: FoodShape[] = [
  {
    name: "apple",
    kind: "plant",
    path: "M12 7.5C13 4.5 15 3 17 3C16.8 5 15.5 6.4 13.8 7C15.5 6 18.5 6.2 19.6 8.6C20.8 11.3 19.8 15.4 17.6 18.4C16.3 20.2 15 21 13.8 21C13 21 12.6 20.6 12 20.6C11.4 20.6 11 21 10.2 21C9 21 7.7 20.2 6.4 18.4C4.2 15.4 3.2 11.3 4.4 8.6C5.5 6.2 8.5 6 10.2 7C10.9 7.4 11.6 7.6 12 7.5Z",
  },
  {
    name: "carrot",
    kind: "plant",
    path: "M4 20C5 17 8 11.5 11 9C12 8.2 13.2 7.8 14.3 7.9L13.5 4.5L15.6 6.9L17.5 3L17.6 7.2L21 6.5L17.4 8.9C18 10.3 17.6 12.4 16 14C13.5 16.8 7.5 19.5 4 20Z",
  },
  {
    name: "fish",
    kind: "other",
    path: "M2.5 12L5.5 8.5L6.5 11C8.5 7.5 12 6 15 6.2C18.5 6.5 21 9 21.5 12C21 15 18.5 17.5 15 17.8C12 18 8.5 16.5 6.5 13L5.5 15.5Z",
  },
  {
    name: "egg",
    kind: "other",
    path: "M12 3C15.5 3 19 9 19 14C19 18 16 21 12 21C8 21 5 18 5 14C5 9 8.5 3 12 3Z",
  },
  {
    name: "avocado",
    kind: "plant",
    path: "M12 2.5C14 2.5 15 4.3 15.5 6.5C16 8.5 18.5 10.5 18.5 14.5C18.5 18.5 15.5 21.5 12 21.5C8.5 21.5 5.5 18.5 5.5 14.5C5.5 10.5 8 8.5 8.5 6.5C9 4.3 10 2.5 12 2.5Z",
  },
  {
    name: "cherry",
    kind: "plant",
    path: "M11 13C11.5 9 13.5 5 17.5 3L18 3.8C14.5 5.8 12.8 9.5 12.5 13.1C15 13.5 16.5 15.5 16.5 17.5C16.5 20 14.5 21.5 12 21.5C9.5 21.5 7.5 20 7.5 17.5C7.5 15.3 9 13.3 11 13Z",
  },
  {
    name: "tomato",
    kind: "plant",
    path: "M12 6.5C13 5 14.5 4.5 16 5L14.6 6.3C17.8 6.6 20.5 9.5 20.5 13.2C20.5 17.8 16.7 21 12 21C7.3 21 3.5 17.8 3.5 13.2C3.5 9.5 6.2 6.6 9.4 6.3L8 5C9.5 4.5 11 5 12 6.5Z",
  },
  {
    name: "pear",
    kind: "plant",
    path: "M12 3C12.3 3 12.6 3.3 12.6 3.8C12.6 4.6 13 5.2 13.6 6C14.6 7.4 15 8.6 15.4 10C15.8 11.4 17.8 12.6 18 15.6C18.2 19 15.6 21.5 12 21.5C8.4 21.5 5.8 19 6 15.6C6.2 12.6 8.2 11.4 8.6 10C9 8.6 9.4 7.4 10.4 6C11 5.2 11.4 4.6 11.4 3.8C11.4 3.3 11.7 3 12 3Z",
  },
  {
    name: "broccoli",
    kind: "plant",
    path: "M10 21L10.6 15.5C8.5 16.2 5.5 15.6 4.4 13.2C3.2 10.6 4.8 7.8 7.2 7.6C7.6 4.8 10 3 12.6 3.4C14.8 3.7 16.4 5.4 16.8 7.2C19.2 7.2 21 9.4 20.6 11.8C20.2 14.6 17 16.2 13.6 15.5L14.2 21Z",
  },
];

export const PLANT_SHAPES = FOOD_SHAPES.filter(
  (shape) => shape.kind === "plant",
);

/**
 * One flubber interpolator per shape, morphing shape `i` into shape
 * `(i + 1) % FOOD_SHAPES.length`.
 */
export function createMorphInterpolators(): Interpolator[] {
  return FOOD_SHAPES.map((shape, i) =>
    interpolate(shape.path, FOOD_SHAPES[(i + 1) % FOOD_SHAPES.length].path, {
      maxSegmentLength: 0.5,
    }),
  );
}
