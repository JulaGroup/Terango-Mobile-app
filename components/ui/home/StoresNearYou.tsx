import { stores } from "@/constants/fakeData";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { FlatList, Image, Text, TouchableOpacity, View } from "react-native";

const StoresNearYou = () => {
  return (
    <View style={{ marginTop: 15 }}>
      <View style={{ paddingHorizontal: 15 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 10,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "bold",
              fontFamily: "Poppins",
            }}
          >
            Stores Near You
          </Text>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              gap: 5,
              alignItems: "center",
              marginBottom: 5,
            }}
          >
            <Text style={{ color: "#A5A4A4FF" }}>See All</Text>
            <Ionicons name="chevron-forward" size={20} color="#A5A4A4FF" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={stores}
          keyExtractor={(store) => store.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 15 }}
          renderItem={({ item: store }) => (
            <View
              style={{
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 15, // spacing between items
              }}
            >
              <Image
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 50,
                }}
                source={store.image}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  fontFamily: "Poppins",
                  textAlign: "center",
                  marginTop: 5,
                }}
              >
                {store.name}
              </Text>
            </View>
          )}
        />
      </View>
    </View>
  );
};

export default StoresNearYou;
