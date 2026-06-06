import React from 'react';
import { Text, type TextStyle } from 'react-native';

interface LangNumberProps {
  value: number;
  prefix?: string;
  style?: TextStyle;
}

export function LangNumber({ value, prefix = '', style }: LangNumberProps) {
  return (
    <Text style={style}>
      {prefix}{value.toLocaleString('en-IN')}
    </Text>
  );
}
