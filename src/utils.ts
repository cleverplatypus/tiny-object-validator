import { FieldsState, ValidationState } from "./types"

export function createValidationStateForFields(fields: Array<string>): ValidationState {
    return {
      isValid: false,
      fields: fields.reduce(
        (acc, field) => {
          acc[field] = false
          return acc
        },
        {} as FieldsState
      )
    }
  }