import { Text } from "ink";
import { COLORS } from "../constants.js";

interface IndicatorProps {
  isSelected?: boolean;
}

interface ItemProps {
  isSelected?: boolean;
  label: string;
}

export function CustomIndicator({ isSelected }: IndicatorProps) {
  return (
    <Text color={isSelected ? COLORS.amber : COLORS.gray}>
      {isSelected ? "> " : "  "}
    </Text>
  );
}

export function CustomItem({ isSelected, label }: ItemProps) {
  return (
    <Text color={isSelected ? COLORS.amber : COLORS.gray} bold={isSelected}>
      {label}
    </Text>
  );
}
