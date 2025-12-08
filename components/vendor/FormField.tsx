import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from "react-native";

interface FormFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  helperText,
  error,
  containerStyle,
  editable = true,
  style,
  ...inputProps
}) => {
  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.requiredMark}>*</Text> : null}
        </Text>
        {helperText && !hasError ? (
          <Text style={styles.helper}>{helperText}</Text>
        ) : null}
      </View>

      <TextInput
        style={[
          styles.input,
          !editable && styles.disabledInput,
          hasError && styles.inputError,
          style,
        ]}
        editable={editable}
        placeholderTextColor="#94A3B8"
        {...inputProps}
      />

      {hasError ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  requiredMark: {
    color: "#EF4444",
    marginLeft: 4,
  },
  helper: {
    fontSize: 12,
    color: "#64748B",
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  disabledInput: {
    backgroundColor: "#F8FAFC",
    color: "#94A3B8",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: "#B91C1C",
  },
});

export default FormField;
