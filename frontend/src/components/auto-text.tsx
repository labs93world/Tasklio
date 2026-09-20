import React from "react";
import { Text, TextProps } from "react-native";

type Props = TextProps & { children: React.ReactNode; lines?: number };

// Auto-shrinking text. `adjustsFontSizeToFit` scales the text down to fit the
// available width for the given number of lines on iOS & Android; on web it is
// ignored and the text wraps/clips per numberOfLines. Use for titles/labels
// that must stay on a fixed number of lines regardless of length.
export function AutoText({ children, lines = 1, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      numberOfLines={lines}
      adjustsFontSizeToFit
      minimumFontScale={0.55}
      style={style}
    >
      {children}
    </Text>
  );
}
