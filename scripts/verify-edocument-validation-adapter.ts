import { buildValidatorArgs, normalizeValidatorOutput } from "@/modules/edocument/services/official-validation-adapter.service";

function assertDeepEqual(actual: string[], expected: string[], message: string) {
  const actualValue = JSON.stringify(actual);
  const expectedValue = JSON.stringify(expected);

  if (actualValue !== expectedValue) {
    throw new Error(`${message}\nBeklenen: ${expectedValue}\nGelen: ${actualValue}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const values = {
  xml: "/tmp/beemmb ubl/document.xml",
  schema: "/tmp/gib schemas/invoice.sch",
};

assertDeepEqual(
  buildValidatorArgs("--schema {schema} --xml {xml}", values),
  ["--schema", "/tmp/gib schemas/invoice.sch", "--xml", "/tmp/beemmb ubl/document.xml"],
  "Validator placeholder değerleri argümanlara yerleşmelidir.",
);

assertDeepEqual(
  buildValidatorArgs("--schema \"{schema}\" --xml '{xml}' --mode strict", values),
  ["--schema", "/tmp/gib schemas/invoice.sch", "--xml", "/tmp/beemmb ubl/document.xml", "--mode", "strict"],
  "Validator argüman şablonu tırnaklı path değerlerini desteklemelidir.",
);

assertDeepEqual(
  buildValidatorArgs("   ", values),
  [],
  "Boş validator argüman şablonu boş argüman listesi üretmelidir.",
);

assert(
  normalizeValidatorOutput("").includes("Bilinmeyen doğrulama hatası"),
  "Boş validator çıktısı okunur varsayılan hata mesajı üretmelidir.",
);

assert(
  normalizeValidatorOutput("x".repeat(2_500)).length <= 2_003,
  "Uzun validator çıktısı hata mesajını şişirmemek için kırpılmalıdır.",
);

console.log("E-belge validation adapter doğrulaması geçti.");
