import type {
  ValidationContext,
  ValidationFields,
  ValidationMessage,
  ValidationSettings,
} from "./types";
import set from "lodash.set";
import get from "lodash.get";

export const EMPTY_MANDATORY_FIELD_ERROR = "empty-mandatory-field";
export const DEFAULT_FAILED_FIELD_MESSAGE = "field-validation-failed";

const DEFAULT_EMPTY_FIELD_TEST = (data) =>
  typeof data !== "number" && (data === false || !data?.length); //this covers required true, null, undefined, '' and empty array

function resolveMessage(
  message: ValidationMessage,
  context: ValidationContext
) {
  return typeof message === "function" ? message(context) : message;
}

/**
 * ObjectValidator is a class that can be used to validate objects.
 * It can be intanciated with a set of fields and then used
 * multiple times to validate objects.
 */
export class ObjectValidator {
  private fields: ValidationFields;
  private mandatoryFieldError: ValidationMessage = EMPTY_MANDATORY_FIELD_ERROR;
  private emptyFieldTest = DEFAULT_EMPTY_FIELD_TEST;

  /**
   *
   * @param fields An array of ValidationField objects that define the rules for the validation.
   */
  constructor(fields: ValidationFields) {
    this.fields = fields;
  }

  private async evaluateFields({
    source,
    fields,
    out,
    contextData,
    base = "",
  }: {
    source: any;
    fields: ValidationFields;
    out: any;
    contextData?: Object | Array<any>;
    base?: string;
  }): Promise<boolean> {
    let valid = true;

    const invalidate = (name: string, message: ValidationMessage) => {
      valid = false;
      set(out, name, message);
    };

    const setValid = (name: string) => {
      set(out, name, true);
    };

    for (let field of fields) {
      const fieldData = get(source, field.name);
      const isEmpty = await (field.emptyTest || this.emptyFieldTest)(fieldData);
      const aContext = Object.freeze({
            currentFieldName: field.name,
            source,
            contextData : contextData
          });

      if (field.skipIf && field.skipIf(aContext)) {
        continue;
      }
      if (field.isOptional && isEmpty) {
        continue; //empty/false but not mandatory. no issue
      }
      const path = base
        .split(".")
        .concat(field.name.split("."), "")
        .filter((seg) => !!seg)
        .join(".");

      if (!field.isOptional && isEmpty) {
        invalidate(
          path,
          resolveMessage(
            field.emptyFieldMessage || this.mandatoryFieldError,
            aContext
          )
        );
        continue;
      }
      //first set the name valid. This will be overridden on test failure
      setValid(path);

      //check for subfields
      if (Array.isArray(get(source, field.name)) && field.fields) {
        let idx = 0;
        for (const subData of get(source, field.name)) {
          valid =
            (await this.evaluateFields({
              fields: field.fields,
              source: subData,
              out,
              contextData,
              base: `${path}.${idx}`,
            })) && valid;
          idx++;
        }
      }

      if (!field.tests) {
        continue;
      }

      let stopFields = false;

      for (let test of field.tests) {
        const result = await test.fn(fieldData, aContext);
        if (result !== true) {
          const message =
            typeof result === "string"
              ? result
              : test.message
              ? resolveMessage(test.message, aContext)
              : DEFAULT_FAILED_FIELD_MESSAGE;
          invalidate(path, message);
          if (field.stopOnFailure) {
            if (field.stopOnFailure === "fields") {
              stopFields = true;
            }
            break;
          }
          continue;
        }
        if (field.stopOnSuccess) {
          if (field.stopOnSuccess === "fields") {
            stopFields = true;
          }
          break;
        }
      }
      if (stopFields) {
        break;
      }
    }

    return valid;
  }

  /**
   *
   * @param message A message to be used when a mandatory field is empty.
   * @returns
   */
  withMandatoryFieldError(message: ValidationMessage) {
    this.mandatoryFieldError = message;
    return this;
  }

  /**
   *
   * @param fn A function that returns true if the field is to be considered empty.
   * @returns
   */
  withEmptyFieldTest(fn: (value: any) => boolean) {
    this.emptyFieldTest = fn;
    return this;
  }

  /**
   *
   * @param {ValidationSettings} settings the `stateObj`, the `source` and optional `contextData` to be used for the validation.
   * @returns Promise<boolean> A promise that resolves to true if the validation is successful.
   */
  async validate({ stateObj, source, contextData }: ValidationSettings) {
    //set output fields state to initial false
    const out = Object.keys(stateObj.fields).reduce(
      (acc, key) => ({ ...acc, [key]: false }),
      {}
    );

    const valid = await this.evaluateFields({
      source,
      fields: this.fields,
      out,
      contextData,
    });

    Object.assign(stateObj.fields, out);
    return (stateObj.isValid = valid);
  }
}
