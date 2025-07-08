import {
  ObjectValidator,
  DEFAULT_EMPTY_MANDATORY_FIELD_ERROR,
  ValidationFields,
  ValidationState,
  createValidationStateForFields,
  DEFAULT_FAILED_FIELD_ERROR,
} from "../src/index.ts";
import { describe, expect, it } from "vitest";

describe("Validation_class", () => {
  it("test_creation_of_validation_state", () => {
    // Given
    const fields = ["name", "age"];
    const stateObj = createValidationStateForFields(fields);

    // When
    const result = stateObj;

    // Then
    expect(result.isValid).toBe(false);
    expect(result.fields).toEqual({ name: false, age: false });
  });

  it("test_default_empty_mandatory_field_message", async () => {
    // Given
    const stateObj: ValidationState = {
      isValid: false,
      fields: { name: false },
    };
    const fields: ValidationFields = [
      {
        name: "name",
      },
    ];
    const source = { name: "" };
    const validator = new ObjectValidator(fields);

    // When
    await validator.validate({
      source,
      stateObj,
    });

    // Then
    expect(stateObj.isValid).toBe(false);
    expect(stateObj.fields.name).toEqual(DEFAULT_EMPTY_MANDATORY_FIELD_ERROR);
  });

  it("test_validate_empty_mandatory_field", async () => {
    // Given
    const stateObj: ValidationState = {
      isValid: false,
      fields: { name: false },
    };
    const fields: ValidationFields = [
      {
        name: "name",
      },
    ];
    const source = { name: "" };
    const validator = new ObjectValidator(fields);

    // When
    await validator.validate({
      source,
      stateObj,
    });

    // Then
    expect(stateObj.isValid).toBe(false);
    expect(stateObj.fields.name).toEqual(DEFAULT_EMPTY_MANDATORY_FIELD_ERROR);

    ObjectValidator.setDefaultMandatoryFieldError("custom error");
    await validator.validate({
      source,
      stateObj,
    });
    expect(stateObj.isValid).toBe(false);
    expect(stateObj.fields.name).toEqual("custom error");
    validator.withMandatoryFieldError("some other error");
    await validator.validate({
      source,
      stateObj,
    });
    expect(stateObj.isValid).toBe(false);
    expect(stateObj.fields.name).toEqual("some other error");
  });

  it("test_specific_failed_field_error", async () => {
    // Given
    const stateObj: ValidationState = {
      isValid: false,
      fields: { name: false },
    };
    const fields: ValidationFields = [
      {
        name: "name",
        tests: [
          {
            fn: () => false,
            message: (context) =>
              `Invalid value for "${context.currentFieldName}"`,
          },
        ],
      },
      {
        name: "age",
        tests: [
          {
            fn: () => false,
          },
        ],
      },
    ];
    const source = { name: "John", age: 17 };
    const validator = new ObjectValidator(fields);

    // When
    await validator.validate({
      source,
      stateObj,
    });

    // Then
    expect(stateObj.isValid).toBe(false);
    expect(stateObj.fields.name).toEqual('Invalid value for "name"');
    expect(stateObj.fields.age).toEqual(DEFAULT_FAILED_FIELD_ERROR);
    validator.withFailedFieldDefaultError("custom error");
    await validator.validate({
      source,
      stateObj,
    });
    expect(stateObj.isValid).toBe(false);
    expect(stateObj.fields.name).toEqual('Invalid value for "name"');
    expect(stateObj.fields.age).toEqual("custom error");
  });

  // Tests that validate skips fields with no tests and fields with skipIf condition true.
  it("test_skipped_fields", async () => {
    // Given
    const stateObj: ValidationState = {
      isValid: false,
      fields: { name: false, age: false },
    };
    const fields: ValidationFields = [
      {
        name: "name",
      },
      {
        name: "age",
        skipIf: () => true,
      },
    ];
    const source = { name: "John", age: 25 };
    const validator = new ObjectValidator(fields);

    // When
    await validator.validate({ source, stateObj });

    // Then
    expect(stateObj.isValid).toBe(true);
  });

  // Tests that validate marks invalid fields with the correct error message.
  it("test_validate_invalid_fields", async () => {
    // Given
    const stateObj: ValidationState = {
      isValid: false,
      fields: { email: false },
    };
    const fields: ValidationFields = [
      {
        name: "email",
        tests: [
          {
            fn: () => false,
            message: "Invalid email",
          },
        ],
      },
    ];
    const source = { email: "invalid" };
    const validation = new ObjectValidator(fields);

    // When
    await validation.validate({
      source,
      stateObj,
    });

    // Then
    expect(stateObj.isValid).toBe(false);
    expect(stateObj.fields.email).toEqual("Invalid email");
  });

  // Tests that validation fields evaluation stops on first failure if rule.stopOnFailure === 'fields'.
  it("test_validate_stop_on_failure", async () => {
    // Given
    const stateObj: ValidationState = {
      isValid: false,
      fields: {
        age: false,
        name: false,
      },
    };
    const fields: ValidationFields = [
      {
        name: "age",
        tests: [
          {
            fn: () => false,
            message: "Invalid age",
          },
        ],
        stopOnFailure: "fields",
      },
      {
        name: "name",
      },
    ];
    const source = {
      age: 17,
      name: "John",
    };
    const validator = new ObjectValidator(fields);

    // When
    await validator.validate({ source, stateObj });

    // Then
    expect(stateObj.isValid).toBe(false);
    expect(stateObj.fields.age).toEqual("Invalid age");
    expect(stateObj.fields.name).toBe(false);
  });

  // Tests that a fields rule tests evaluation stops
  // on first success if rule.stopOnSuccess === 'tests'.
  it("test_validate_stop_on_success", async () => {
    // Given
    const stateObj: ValidationState = {
      isValid: false,
      fields: {
        age: false,
        name: false,
      },
    };
    const fields: ValidationFields = [
      {
        name: "age",
        tests: [
          {
            fn: () => true,
            message: "Invalid age",
          },
          {
            fn: () => false, //this should be always skipped a s the previous test always succeedes
          },
        ],
        stopOnSuccess: "tests",
      },

      {
        name: "name",
      },
    ];
    const source = { age: 17, name: "John" };
    const validator = new ObjectValidator(fields);

    // When
    await validator.validate({ source, stateObj });

    // Then
    expect(stateObj.isValid).toBe(true);
    expect(stateObj.fields.age).toBe(true);
    expect(stateObj.fields.name).toBe(true);
  });

  // Tests that validate returns true for valid data.
  it("test_validate_valid_data", async () => {
    console.info(`Test: test_validate_valid_data}`);

    // Given
    const stateObj: ValidationState = {
      isValid: false,
      fields: {
        name: false,
      },
    };
    const fields: ValidationFields = [
      {
        name: "name",
        tests: [
          {
            fn: () => true,
          },
        ],
      },
    ];
    const source = { name: "John" };
    const validator = new ObjectValidator(fields);

    // When
    await validator.validate({ source, stateObj });

    // Then
    expect(stateObj.isValid).toBe(true);
  });

  // Tests that validate does not mark optional empty fields as invalid.
  it("test_validate_optional_fields", async () => {
    // Given
    const stateObj: ValidationState = {
      isValid: false,
      fields: {
        email: false,
      },
    };
    const fields: ValidationFields = [
      {
        name: "email",
        isOptional: true,
      },
    ];
    const source = {};
    const validation = new ObjectValidator(fields);

    // When
    await validation.validate({ source, stateObj });

    // Then
    expect(stateObj.isValid).toBe(true);
  });

  // Tests that validate uses the custom mandatory name error message when set.
  it("test_validate_custom_mandatory_error", async () => {
    // Given
    const stateObj: ValidationState = {
      isValid: false,
      fields: {},
    };
    const fields: ValidationFields = [
      {
        name: "name",
        isOptional: false,
      },
    ];
    const source = { name: "" };
    const errorMessage = "This name is required";
    const validator = new ObjectValidator(fields).withMandatoryFieldError(
      errorMessage
    );

    // When
    await validator.validate({ source, stateObj });

    // Then
    expect(stateObj.isValid).toBe(false);
    expect(stateObj.fields.name).toEqual(errorMessage);
  });

  // Tests that validate handles numeric fields correctly.
  it("test_validate_numeric_fields", async () => {
    // Given
    const stateObj: ValidationState = { fields: {}, isValid: false };
    const fields: ValidationFields = [
      {
        name: "age",
        tests: [
          {
            fn: (data) => typeof data === "number",
            message: "Age must be a number",
          },
        ],
      },
    ];
    const source = { age: 25 };
    const validator = new ObjectValidator(fields);

    // When
    const result = await validator.validate({ source, stateObj });

    // Then
    expect(result).toBe(true);
    expect(stateObj.isValid).toBe(true);
  });

  // Tests that validate handles deep properties correctly.
  it("test_validate_deep_properties", async () => {
    // Given
    const stateObj: ValidationState = { fields: {}, isValid: false };
    const fields: ValidationFields = [
      {
        name: "address.post_code",
        tests: [
          {
            fn: (data) => typeof data === "number",
            message: "Post Code must be a number",
          },
        ],
      },
    ];
    const source = { address: { post_code: 4890 } };

    const validator = new ObjectValidator(fields);

    // When
    const result = await validator.validate({ source, stateObj });

    // Then
    expect(result).toBe(true);
    expect(stateObj.isValid).toBe(true);
  });

  it("test_validate_deep_fields", async () => {
    const stateObj: ValidationState = {
      fields: {
        "subs.0.bread": false,
      },
      isValid: false,
    };

    const fields: ValidationFields = [
      {
        name: "subs",
        fields: [
          {
            name: "bread",
            tests: [
              {
                fn: (val) => ["herbs", "wholemeal"].includes(val),
                message: "Bread not available",
              },
            ],
          },
        ],
      },
    ];
    const source = {
      subs: [
        {
          bread: "grains",
        },
        {
          bread: "grains",
        },
      ],
    };

    const validator = new ObjectValidator(fields);
    // When
    const result = await validator.validate({ source, stateObj });

    // Then
    expect(result).toBe(false);
    expect(stateObj.isValid).toBe(false);
  });

  // Tests dynamic validation error messages
  it("test_validate_empty_mandatory_field", async () => {
    // Given
    const stateObj: ValidationState = {
      isValid: false,
      fields: { name: false },
    };
    const fields: ValidationFields = [
      {
        name: "name",
        tests: [
          {
            fn: () => false,
            message: (context) => `Field ${context.currentFieldName} is bad`,
          },
        ],
      },
    ];
    const source = { name: "Michael" };
    const validator = new ObjectValidator(fields);

    // When
    await validator.validate({
      source,
      stateObj,
    });

    // Then
    expect(stateObj.isValid).toBe(false);
    expect(stateObj.fields.name).toEqual("Field name is bad");
  });
});
