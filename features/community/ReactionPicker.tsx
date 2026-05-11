import { Modal, Pressable, Text, View } from 'react-native';

const REACTIONS = ['😀', '😂', '😭', '❤️', '👍', '🙏'];

export interface ReactionPickerProps {
  visible: boolean;
  current?: string | null;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  onClear: () => void;
}

export function ReactionPicker({ visible, current, onClose, onSelect, onClear }: ReactionPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="flex-row items-center rounded-full bg-white px-2 py-2"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          {REACTIONS.map((emoji) => {
            const selected = emoji === current;
            return (
              <Pressable
                key={emoji}
                onPress={() => {
                  if (selected) {
                    onClear();
                  } else {
                    onSelect(emoji);
                  }
                }}
                className="mx-1 h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: selected ? '#FFF1F3' : 'transparent' }}
              >
                <Text className="text-[24px]">{emoji}</Text>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
