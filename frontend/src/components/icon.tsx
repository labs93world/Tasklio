import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

type IconProps = {
  name: string;
  size?: number;
  color: string;
  style?: any;
};

// Thin wrapper so the whole app imports icons from one place.
// Dynamic (named) import keeps the font working inside Expo Go.
export function Icon({ name, size = 24, color, style }: IconProps) {
  return <MaterialDesignIcons name={name as any} size={size} color={color} style={style} />;
}
