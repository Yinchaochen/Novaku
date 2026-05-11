import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Pressable, Text, View, ViewStyle } from 'react-native';

export type MenuAction = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  pageY: number;
  pageX: number;
  row1: MenuAction[];
  row2: MenuAction[];
  onAction: (id: string) => void;
  onClose: () => void;
};

const ITEM_WIDTH = 60;
const ITEM_HEIGHT = 72;
const PADDING_H = 8;

export function MessageActionMenu({ visible, pageY, pageX, row1, row2, onAction, onClose }: Props) {
  if (!visible) return null;

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const maxCols = Math.max(row1.length, row2.length);
  const MENU_WIDTH = Math.min(maxCols * ITEM_WIDTH + PADDING_H * 2, SCREEN_WIDTH - 32);
  const rowCount = (row1.length > 0 ? 1 : 0) + (row2.length > 0 ? 1 : 0);
  const MENU_HEIGHT = rowCount * ITEM_HEIGHT + (rowCount > 1 ? 1 : 0) + 16;

  const showAbove = pageY > SCREEN_HEIGHT * 0.52;
  const ARROW_SIZE = 10;

  const menuLeft = Math.max(16, Math.min(SCREEN_WIDTH - MENU_WIDTH - 16, pageX - MENU_WIDTH / 2));
  const arrowLeft = Math.max(8, Math.min(MENU_WIDTH - 20, pageX - menuLeft - ARROW_SIZE / 2));

  const cardStyle: ViewStyle = {
    position: 'absolute',
    left: menuLeft,
    width: MENU_WIDTH,
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    zIndex: 310,
    overflow: 'visible',
  };

  if (showAbove) {
    cardStyle.bottom = SCREEN_HEIGHT - pageY + ARROW_SIZE + 4;
  } else {
    cardStyle.top = pageY + ARROW_SIZE + 4;
  }

  const arrowStyle: ViewStyle = {
    position: 'absolute',
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    backgroundColor: '#2C2C2E',
    transform: [{ rotate: '45deg' }],
    left: arrowLeft,
    zIndex: 305,
  };

  if (showAbove) {
    arrowStyle.bottom = -ARROW_SIZE / 2;
    arrowStyle.borderBottomRightRadius = 2;
  } else {
    arrowStyle.top = -ARROW_SIZE / 2;
    arrowStyle.borderTopLeftRadius = 2;
  }

  const renderRow = (actions: MenuAction[], isSecond: boolean) => {
    if (actions.length === 0) return null;
    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          borderTopWidth: isSecond ? 0.5 : 0,
          borderTopColor: '#48484A',
          paddingVertical: 8,
          paddingHorizontal: PADDING_H,
        }}
      >
        {actions.map((action) => (
          <Pressable
            key={action.id}
            onPress={() => { onAction(action.id); }}
            style={({ pressed }) => ({
              width: ITEM_WIDTH,
              alignItems: 'center',
              paddingVertical: 4,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: action.destructive ? 'rgba(255,69,58,0.18)' : '#3A3A3C',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 5,
              }}
            >
              <Ionicons
                name={action.icon}
                size={20}
                color={action.destructive ? '#FF453A' : '#EBEBF5'}
              />
            </View>
            <Text
              style={{
                color: action.destructive ? '#FF453A' : '#EBEBF5',
                fontSize: 10,
                fontWeight: '500',
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <Pressable
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.48)',
        zIndex: 300,
      }}
      onPress={onClose}
    >
      <Pressable onPress={(e) => e.stopPropagation()} style={cardStyle}>
        {renderRow(row1, false)}
        {renderRow(row2, row1.length > 0)}
        <View style={arrowStyle} />
      </Pressable>
    </Pressable>
  );
}
