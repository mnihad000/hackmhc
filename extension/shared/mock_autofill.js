(function (global) {
  const MOCK_AUTOFILL_ENABLED_KEY = "mock_autofill_enabled";
  const MOCK_FIXTURE_INDEX_PATH = "tests/fixtures/autofill/manual_fixture_responses.json";
  const DEMO_PROFILE = {
    title: "Ms",
    first_name: "Amina",
    middle_initial: "B",
    last_name: "Diallo",
    full_name: "Amina B Diallo",
    company: "FamilyOS",
    position: "Program Manager",
    address_line_1: "123 Maple Ave",
    address_line_2: "Apt 4B",
    city: "Boston",
    state: "MA",
    country: "United States",
    zip: "02118",
    home_phone: "+1 555 101 2222",
    work_phone: "+1 555 202 3333",
    fax: "+1 555 404 5555",
    email: "amina.diallo@example.com",
    website: "https://familyos.example",
    username: "amina.diallo",
    password: "DemoPass!234",
    credit_card_type: "Visa",
    credit_card_number: "4111111111111111",
    card_verification_code: "123",
    card_exp_month: "03",
    card_exp_year: "2028",
    card_user_name: "Amina Diallo",
    card_issuing_bank: "FamilyOS Credit Union",
    card_customer_service_phone: "+1 800 555 0100",
    sex: "Female",
    ssn: "123-45-6789",
    driver_license: "D1234567",
    dob: "1988-03-22",
    dob_month: "03",
    dob_day: "22",
    dob_year: "1988",
    age: "38",
    birth_place: "Dakar",
    income: "85000",
    custom_message: "Demo data for FamilyOS autofill testing.",
    comments: "Review values before submitting any live form."
  };

  let fixtureIndexPromise = null;

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function safeText(value) {
    return value == null ? "" : String(value).trim();
  }

  function pageFixtureName(pageUrl) {
    if (!pageUrl) return null;

    try {
      const url = new URL(pageUrl);
      const parts = url.pathname.split("/").filter(Boolean);
      return parts.length ? parts[parts.length - 1] : null;
    } catch (_error) {
      return null;
    }
  }

  function mockFixtureIndexPath() {
    if (global.chrome?.runtime?.getURL) {
      return global.chrome.runtime.getURL(MOCK_FIXTURE_INDEX_PATH);
    }
    return MOCK_FIXTURE_INDEX_PATH;
  }

  async function loadFixtureIndex() {
    if (!fixtureIndexPromise) {
      fixtureIndexPromise = fetch(mockFixtureIndexPath()).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Mock fixture load failed (${response.status})`);
        }
        return response.json();
      });
    }

    return fixtureIndexPromise;
  }

  function confidenceBucket(confidence) {
    if (confidence >= 0.85) return "high";
    if (confidence >= 0.65) return "medium";
    return "low";
  }

  function fieldText(field) {
    return normalizeText([
      field?.field_name,
      field?.label,
      field?.placeholder,
      field?.section,
      field?.context
    ].join(" "));
  }

  function fieldIdForSuggestion(field, index) {
    const fallback = safeText(field?.field_name || `field_${index}`);
    return safeText(field?.field_id || `${fallback}|${index}`);
  }

  function matchesAny(text, patterns) {
    return patterns.some((pattern) => text.includes(pattern));
  }

  function optionChoice(field, preferredValues, preferredLabels = preferredValues) {
    const options = Array.isArray(field?.options) ? field.options : [];
    if (!options.length) return null;

    const normalizedValues = preferredValues.map((value) => normalizeText(value));
    const normalizedLabels = preferredLabels.map((value) => normalizeText(value));

    const match = options.find((option) => {
      const optionValue = normalizeText(option?.value);
      const optionLabel = normalizeText(option?.label);
      return normalizedValues.includes(optionValue) || normalizedLabels.includes(optionLabel);
    });

    if (!match) return null;

    const preferredValueHit = normalizedValues.includes(normalizeText(match.value));
    return {
      value: safeText(match.value || match.label),
      fill_strategy: preferredValueHit ? "select_by_value" : "select_by_label"
    };
  }

  function buildDemoMatch(field) {
    const text = fieldText(field);
    const fieldType = safeText(field?.type).toLowerCase();
    const normalizedKey = safeText(field?.normalized_key).toLowerCase();

    if (!text) return null;

    const selectState = optionChoice(field, [DEMO_PROFILE.state], ["massachusetts", DEMO_PROFILE.state]);
    const selectCountry = optionChoice(field, ["US", "USA", DEMO_PROFILE.country], [DEMO_PROFILE.country, "united states"]);
    const selectCardType = optionChoice(field, [DEMO_PROFILE.credit_card_type], ["visa", "visa preferred"]);
    const selectCardExpMonth = optionChoice(field, [DEMO_PROFILE.card_exp_month], ["03", "mar", "march"]);
    const selectCardExpYear = optionChoice(field, [DEMO_PROFILE.card_exp_year], [DEMO_PROFILE.card_exp_year]);
    const selectDobMonth = optionChoice(field, [DEMO_PROFILE.dob_month], ["03", "mar", "march"]);
    const selectDobDay = optionChoice(field, [DEMO_PROFILE.dob_day], [DEMO_PROFILE.dob_day]);
    const selectDobYear = optionChoice(field, [DEMO_PROFILE.dob_year], [DEMO_PROFILE.dob_year]);

    if (matchesAny(text, ["credit card type", "cc type", "40cc type"]) && selectCardType) {
      return {
        ...selectCardType,
        profile_key: "payment.card_type",
        source_ref: "demo_profile.payment.card_type",
        reason: "Demo card type matched the current select options.",
        confidence: 0.9
      };
    }

    if (matchesAny(text, ["ccexp mm", "expiration month", "exp month", "card expiration month"]) && selectCardExpMonth) {
      return {
        ...selectCardExpMonth,
        profile_key: "payment.card_exp_month",
        source_ref: "demo_profile.payment.card_exp_month",
        reason: "Demo card expiration month matched the current select options.",
        confidence: 0.86
      };
    }

    if (matchesAny(text, ["ccexp yy", "expiration year", "exp year", "card expiration year"]) && selectCardExpYear) {
      return {
        ...selectCardExpYear,
        profile_key: "payment.card_exp_year",
        source_ref: "demo_profile.payment.card_exp_year",
        reason: "Demo card expiration year matched the current select options.",
        confidence: 0.86
      };
    }

    if (fieldType === "select" && matchesAny(text, ["date of birth", " birth ", "66mm"]) && selectDobMonth) {
      return {
        ...selectDobMonth,
        profile_key: "identity.dob_month",
        source_ref: "demo_profile.identity.dob",
        reason: "Demo birth month matched the current select options.",
        confidence: 0.84
      };
    }

    if (fieldType === "select" && matchesAny(text, ["date of birth", " birth ", "67dd"]) && selectDobDay) {
      return {
        ...selectDobDay,
        profile_key: "identity.dob_day",
        source_ref: "demo_profile.identity.dob",
        reason: "Demo birth day matched the current select options.",
        confidence: 0.84
      };
    }

    if (fieldType === "select" && matchesAny(text, ["date of birth", " birth ", "68yy"]) && selectDobYear) {
      return {
        ...selectDobYear,
        profile_key: "identity.dob_year",
        source_ref: "demo_profile.identity.dob",
        reason: "Demo birth year matched the current select options.",
        confidence: 0.84
      };
    }

    if ((normalizedKey === "state" || matchesAny(text, ["state", "province", "region"])) && selectState) {
      return {
        ...selectState,
        profile_key: "home_address.state",
        source_ref: "demo_profile.home_address.state",
        reason: "Demo state matched the current select options.",
        confidence: 0.92
      };
    }

    if (matchesAny(text, ["country"]) && selectCountry) {
      return {
        ...selectCountry,
        profile_key: "home_address.country",
        source_ref: "demo_profile.home_address.country",
        reason: "Demo country matched the current select options.",
        confidence: 0.9
      };
    }

    if (matchesAny(text, ["title"]) && !matchesAny(text, ["job title", "position"])) {
      return {
        value: DEMO_PROFILE.title,
        profile_key: "guardian_1.title",
        source_ref: "demo_profile.guardian_1.title",
        reason: "Demo courtesy title from the sample profile.",
        confidence: 0.88
      };
    }

    if (normalizedKey === "first_name" || matchesAny(text, ["first name", "given name", "frstname", "fname"])) {
      return {
        value: DEMO_PROFILE.first_name,
        profile_key: "guardian_1.first_name",
        source_ref: "demo_profile.guardian_1.first_name",
        reason: "Demo first name from the sample profile.",
        confidence: 0.95
      };
    }

    if (matchesAny(text, ["middle initial", "middle_i", "middle name"])) {
      return {
        value: DEMO_PROFILE.middle_initial,
        profile_key: "guardian_1.middle_initial",
        source_ref: "demo_profile.guardian_1.middle_initial",
        reason: "Demo middle initial from the sample profile.",
        confidence: 0.82
      };
    }

    if (normalizedKey === "last_name" || matchesAny(text, ["last name", "surname", "lastname", "lname"])) {
      return {
        value: DEMO_PROFILE.last_name,
        profile_key: "guardian_1.last_name",
        source_ref: "demo_profile.guardian_1.last_name",
        reason: "Demo last name from the sample profile.",
        confidence: 0.95
      };
    }

    if (matchesAny(text, ["full name", "fullname"])) {
      return {
        value: DEMO_PROFILE.full_name,
        profile_key: "guardian_1.full_name",
        source_ref: "demo_profile.guardian_1.full_name",
        reason: "Demo full name from the sample profile.",
        confidence: 0.92
      };
    }

    if (matchesAny(text, ["company", "organization", "employer"])) {
      return {
        value: DEMO_PROFILE.company,
        profile_key: "guardian_1.company",
        source_ref: "demo_profile.guardian_1.company",
        reason: "Demo company name from the sample profile.",
        confidence: 0.86
      };
    }

    if (matchesAny(text, ["position", "job title", "role"])) {
      return {
        value: DEMO_PROFILE.position,
        profile_key: "guardian_1.position",
        source_ref: "demo_profile.guardian_1.position",
        reason: "Demo job title from the sample profile.",
        confidence: 0.84
      };
    }

    if (matchesAny(text, ["address line 2", "address2", "suite", "apt", "apartment"])) {
      return {
        value: DEMO_PROFILE.address_line_2,
        profile_key: "home_address.line2",
        source_ref: "demo_profile.home_address.line2",
        reason: "Demo address line 2 from the sample profile.",
        confidence: 0.84
      };
    }

    if (normalizedKey === "address_line_1" || matchesAny(text, ["address line 1", "address1", "street address", "street"])) {
      return {
        value: DEMO_PROFILE.address_line_1,
        profile_key: "home_address.line1",
        source_ref: "demo_profile.home_address.line1",
        reason: "Demo street address from the sample profile.",
        confidence: 0.92
      };
    }

    if (normalizedKey === "city" || matchesAny(text, ["city", "town"])) {
      return {
        value: DEMO_PROFILE.city,
        profile_key: "home_address.city",
        source_ref: "demo_profile.home_address.city",
        reason: "Demo city from the sample profile.",
        confidence: 0.92
      };
    }

    if (normalizedKey === "state" || matchesAny(text, ["state", "province", "region"])) {
      return {
        value: DEMO_PROFILE.state,
        profile_key: "home_address.state",
        source_ref: "demo_profile.home_address.state",
        reason: "Demo state from the sample profile.",
        confidence: 0.9
      };
    }

    if (matchesAny(text, ["country"])) {
      return {
        value: DEMO_PROFILE.country,
        profile_key: "home_address.country",
        source_ref: "demo_profile.home_address.country",
        reason: "Demo country from the sample profile.",
        confidence: 0.88
      };
    }

    if (normalizedKey === "zip" || matchesAny(text, ["zip", "postal", "postcode"])) {
      return {
        value: DEMO_PROFILE.zip,
        profile_key: "home_address.zip",
        source_ref: "demo_profile.home_address.zip",
        reason: "Demo postal code from the sample profile.",
        confidence: 0.92
      };
    }

    if (matchesAny(text, ["home phone", "homephon"])) {
      return {
        value: DEMO_PROFILE.home_phone,
        profile_key: "guardian_1.phone_home",
        source_ref: "demo_profile.guardian_1.phone_home",
        reason: "Demo home phone number from the sample profile.",
        confidence: 0.84
      };
    }

    if (matchesAny(text, ["work phone", "work telephone", "workphon", "office phone"])) {
      return {
        value: DEMO_PROFILE.work_phone,
        profile_key: "guardian_1.phone_work",
        source_ref: "demo_profile.guardian_1.phone_work",
        reason: "Demo work phone number from the sample profile.",
        confidence: 0.84
      };
    }

    if (matchesAny(text, ["fax"])) {
      return {
        value: DEMO_PROFILE.fax,
        profile_key: "guardian_1.fax",
        source_ref: "demo_profile.guardian_1.fax",
        reason: "Demo fax number from the sample profile.",
        confidence: 0.78
      };
    }

    if (normalizedKey === "phone" || matchesAny(text, ["cell phone", "cellphon", "mobile", "cell", "telephone", "phone"])) {
      return {
        value: DEMO_PROFILE.home_phone,
        profile_key: "guardian_1.phone",
        source_ref: "demo_profile.guardian_1.phone",
        reason: "Demo phone number from the sample profile.",
        confidence: 0.9
      };
    }

    if (normalizedKey === "email" || matchesAny(text, ["email", "e mail", "emailadr"])) {
      return {
        value: DEMO_PROFILE.email,
        profile_key: "guardian_1.email",
        source_ref: "demo_profile.guardian_1.email",
        reason: "Demo email address from the sample profile.",
        confidence: 0.96
      };
    }

    if (matchesAny(text, ["website", "web site", "url", "web_site"])) {
      return {
        value: DEMO_PROFILE.website,
        profile_key: "guardian_1.website",
        source_ref: "demo_profile.guardian_1.website",
        reason: "Demo website from the sample profile.",
        confidence: 0.84
      };
    }

    if (matchesAny(text, ["user id", "userid", "user_id", "username", "login"])) {
      return {
        value: DEMO_PROFILE.username,
        profile_key: "guardian_1.username",
        source_ref: "demo_profile.guardian_1.username",
        reason: "Demo username from the sample profile.",
        confidence: 0.86
      };
    }

    if (matchesAny(text, ["password", "passcode"])) {
      return {
        value: DEMO_PROFILE.password,
        profile_key: "guardian_1.password",
        source_ref: "demo_profile.guardian_1.password",
        reason: "Sensitive demo password provided for local testing only.",
        confidence: 0.72,
        requires_review: true
      };
    }

    if (matchesAny(text, ["credit card number", "ccnumber", "card number"])) {
      return {
        value: DEMO_PROFILE.credit_card_number,
        profile_key: "payment.card_number",
        source_ref: "demo_profile.payment.card_number",
        reason: "Sensitive demo card number provided for local testing only.",
        confidence: 0.72,
        requires_review: true
      };
    }

    if (matchesAny(text, ["verification code", "cvc", "cvv", "security code"])) {
      return {
        value: DEMO_PROFILE.card_verification_code,
        profile_key: "payment.card_verification_code",
        source_ref: "demo_profile.payment.card_verification_code",
        reason: "Sensitive demo card verification code provided for local testing only.",
        confidence: 0.68,
        requires_review: true
      };
    }

    if (matchesAny(text, ["card user name", "name on card", "cc_uname"])) {
      return {
        value: DEMO_PROFILE.card_user_name,
        profile_key: "payment.card_user_name",
        source_ref: "demo_profile.payment.card_user_name",
        reason: "Demo cardholder name from the sample profile.",
        confidence: 0.84
      };
    }

    if (matchesAny(text, ["issuing bank", "issuer", "ccissuer"])) {
      return {
        value: DEMO_PROFILE.card_issuing_bank,
        profile_key: "payment.card_issuing_bank",
        source_ref: "demo_profile.payment.card_issuing_bank",
        reason: "Demo card issuing bank from the sample profile.",
        confidence: 0.8
      };
    }

    if (matchesAny(text, ["customer service phone", "cstsvc"])) {
      return {
        value: DEMO_PROFILE.card_customer_service_phone,
        profile_key: "payment.card_customer_service_phone",
        source_ref: "demo_profile.payment.card_customer_service_phone",
        reason: "Demo customer service phone from the sample profile.",
        confidence: 0.78
      };
    }

    if (matchesAny(text, ["sex", "gender"])) {
      return {
        value: DEMO_PROFILE.sex,
        profile_key: "guardian_1.sex",
        source_ref: "demo_profile.guardian_1.sex",
        reason: "Demo gender value from the sample profile.",
        confidence: 0.74,
        requires_review: true
      };
    }

    if (normalizedKey === "dob" || matchesAny(text, ["date of birth", "birthday", "dob"])) {
      return {
        value: DEMO_PROFILE.dob,
        profile_key: "guardian_1.dob",
        source_ref: "demo_profile.guardian_1.dob",
        reason: "Demo date of birth from the sample profile.",
        confidence: 0.76,
        requires_review: true
      };
    }

    if (matchesAny(text, ["social security", "ssn"])) {
      return {
        value: DEMO_PROFILE.ssn,
        profile_key: "identity.ssn",
        source_ref: "demo_profile.identity.ssn",
        reason: "Sensitive demo SSN provided for local testing only.",
        confidence: 0.66,
        requires_review: true
      };
    }

    if (matchesAny(text, ["driver license", "driver licence", "driv lic"])) {
      return {
        value: DEMO_PROFILE.driver_license,
        profile_key: "identity.driver_license",
        source_ref: "demo_profile.identity.driver_license",
        reason: "Sensitive demo driver license number provided for local testing only.",
        confidence: 0.7,
        requires_review: true
      };
    }

    if (matchesAny(text, ["age"])) {
      return {
        value: DEMO_PROFILE.age,
        profile_key: "guardian_1.age",
        source_ref: "demo_profile.guardian_1.age",
        reason: "Demo age derived from the sample profile.",
        confidence: 0.68,
        requires_review: true
      };
    }

    if (matchesAny(text, ["birth place", "birth_pl", "place of birth"])) {
      return {
        value: DEMO_PROFILE.birth_place,
        profile_key: "guardian_1.birth_place",
        source_ref: "demo_profile.guardian_1.birth_place",
        reason: "Demo birthplace from the sample profile.",
        confidence: 0.74
      };
    }

    if (matchesAny(text, ["income", "salary"])) {
      return {
        value: DEMO_PROFILE.income,
        profile_key: "guardian_1.income",
        source_ref: "demo_profile.guardian_1.income",
        reason: "Sensitive demo income value provided for local testing only.",
        confidence: 0.66,
        requires_review: true
      };
    }

    if (matchesAny(text, ["custom message", "custom", "message"])) {
      return {
        value: DEMO_PROFILE.custom_message,
        profile_key: "demo.custom_message",
        source_ref: "demo_profile.demo.custom_message",
        reason: "Demo custom message for extension testing.",
        confidence: 0.8
      };
    }

    if (matchesAny(text, ["comments", "comment", "notes"])) {
      return {
        value: DEMO_PROFILE.comments,
        profile_key: "demo.comments",
        source_ref: "demo_profile.demo.comments",
        reason: "Demo comments for extension testing.",
        confidence: 0.78
      };
    }

    return null;
  }

  function buildDemoSuggestions(fields) {
    return (fields || []).map((field, index) => {
      const match = buildDemoMatch(field);
      if (!match) return null;

      const fieldId = fieldIdForSuggestion(field, index);
      const confidence = Number(match.confidence || 0.82);

      return {
        suggestion_id: `sug_demo_${fieldId.replace(/[^\w]+/g, "_")}`,
        field_id: fieldId,
        field_name: safeText(field?.field_name),
        value: safeText(match.value),
        confidence,
        confidence_bucket: confidenceBucket(confidence),
        source_type: safeText(match.source_type || "canonical") || "canonical",
        source_ref: safeText(match.source_ref),
        profile_key: safeText(match.profile_key || "demo.unknown"),
        reason: safeText(match.reason || "Matched from the demo profile."),
        fill_strategy: safeText(match.fill_strategy || "text"),
        requires_review: Boolean(match.requires_review)
      };
    }).filter(Boolean);
  }

  function buildDemoPayloadForRequest(request) {
    return {
      contract_version: safeText(request?.contract_version || "familyos.autofill.v1"),
      request_id: safeText(request?.request_id || `mock_demo_${Date.now()}`),
      suggestions: buildDemoSuggestions(request?.fields || []),
      _mock: {
        mode: "demo_profile",
        fixture_name: null
      }
    };
  }

  async function mockPayloadForRequest(request) {
    const fixtureName = pageFixtureName(request?.page_url);

    if (fixtureName) {
      try {
        const index = await loadFixtureIndex();
        const fixture = index?.[fixtureName];
        if (fixture) {
          return {
            ...fixture,
            contract_version: fixture.contract_version || "familyos.autofill.v1",
            request_id: request?.request_id || fixture.request_id || `mock_${fixtureName}`,
            _mock: {
              mode: "fixture",
              fixture_name: fixtureName
            }
          };
        }
      } catch (_error) {
        // Fall through to the generic demo profile.
      }
    }

    return buildDemoPayloadForRequest(request);
  }

  function mockFeedbackAck(feedback) {
    return {
      contract_version: feedback?.contract_version || "familyos.autofill.v1",
      status: "mock_accepted",
      accepted_events: Array.isArray(feedback?.events) ? feedback.events.length : 0
    };
  }

  const api = {
    DEMO_PROFILE,
    MOCK_AUTOFILL_ENABLED_KEY,
    MOCK_FIXTURE_INDEX_PATH,
    buildDemoPayloadForRequest,
    buildDemoSuggestions,
    loadFixtureIndex,
    mockFeedbackAck,
    mockPayloadForRequest,
    pageFixtureName
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.FamilyOSMockAutofill = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
