import React, { useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity, View, Text } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
}

export function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const opacity = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <Animated.View style={[styles.deleteContainer, { opacity }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            swipeableRef.current?.close();
            onDelete();
          }}
        >
          <Feather name="trash-2" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteContainer: {
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 4,
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    width: 64,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
});
