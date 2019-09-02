module.exports = {
  keyType: "string",
  valueType: "object",
  childTypes: {
    default: {
      type: ["boolean", "string", "object", "number"],
      required: false
    },
    required: {
      type: ["boolean", "function"],
      required: false
    },
    enum: {
      type: "object",
      validator: value => Array.isArray(value),
      required: false
    },
    readOnly: {
      type: "boolean",
      required: false
    },
    immutable: {
      type: "boolean",
      required: false
    },
    type: {
      required: true,
      type: ["boolean", "string", "object", "number"]
    },
    validator: {
      required: false,
      type: "function"
    },
    nullable: {
      required: false,
      type: "boolean"
    },
    writeModifier: {
      required: false,
      type: "function"
    }
  }
};
