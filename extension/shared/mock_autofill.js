(function (global) {
  const MOCK_AUTOFILL_ENABLED_KEY = "mock_autofill_enabled";
  const MOCK_FIXTURE_INDEX_PATH = "tests/fixtures/autofill/manual_fixture_responses.json";
  const DEMO_PROFILE = (() => {
    if (global.FamilyOSHousingMockProfile) {
      return global.FamilyOSHousingMockProfile;
    }

    if (typeof module !== "undefined" && module.exports) {
      try {
        return require("./mock_profiles/housing_application_profile.js");
      } catch (_error) {
        // Fall through to the inline fallback.
      }
    }

    return {
      title: "Ms",
      first_name: "Amina",
      middle_initial: "B",
      last_name: "Diallo",
      full_name: "Amina Bintou Diallo",
      company: "Boston Children's Literacy Center",
      position: "Program Manager",
      address_line_1: "123 Maple Ave",
      address_line_2: "Apt 4B",
      city: "Boston",
      state: "MA",
      country: "United States",
      zip: "02118",
      home_phone: "+1 617 555 0118",
      work_phone: "+1 617 555 0147",
      fax: "+1 617 555 0162",
      email: "amina.diallo@example.com",
      website: "https://amina-diallo.example",
      username: "amina.diallo",
      password: "HousingDemo!234",
      credit_card_type: "Visa",
      credit_card_number: "4111111111111111",
      card_verification_code: "123",
      card_exp_month: "03",
      card_exp_year: "2028",
      card_user_name: "Amina Diallo",
      card_issuing_bank: "Metro Credit Union",
      card_customer_service_phone: "+1 800 555 0100",
      sex: "Female",
      ssn: "123-45-6789",
      driver_license: "S12345678",
      dob: "1988-03-22",
      dob_month: "03",
      dob_day: "22",
      dob_year: "1988",
      age: "38",
      birth_place: "Dakar, Senegal",
      income: "76800",
      monthly_income: "6400",
      landlord_name: "Samuel Brooks",
      landlord_phone: "+1 617 555 0191",
      desired_move_in_date: "2026-06-15",
      desired_unit_type: "2 Bedroom",
      custom_message: "Applying for a two-bedroom apartment with parking, close to transit and school.",
      comments: "Family of three. Seeking a clean, quiet building with in-building laundry and no smoking."
    };
  })();

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

  function textOrOptionChoice(field, preferredValues, preferredLabels = preferredValues) {
    const choice = optionChoice(field, preferredValues, preferredLabels);
    if (choice) return choice;
    return { value: safeText(preferredValues[0]) };
  }

  function yesNoChoice(field, value) {
    const normalized = safeText(value).toLowerCase() === "yes" ? "Yes" : "No";
    if (safeText(field?.type).toLowerCase() === "checkbox") {
      return {
        value: normalized,
        fill_strategy: normalized === "Yes" ? "check" : "uncheck"
      };
    }
    return textOrOptionChoice(field, [normalized], [normalized]);
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
    const selectMaritalStatus = textOrOptionChoice(
      field,
      [DEMO_PROFILE.marital_status],
      [DEMO_PROFILE.marital_status, "married"]
    );
    const selectCitizenshipStatus = textOrOptionChoice(
      field,
      [DEMO_PROFILE.citizenship_status],
      [DEMO_PROFILE.citizenship_status, "u.s. citizen", "us citizen", "citizen"]
    );
    const selectDesiredUnitType = textOrOptionChoice(
      field,
      [DEMO_PROFILE.desired_unit_type],
      [DEMO_PROFILE.desired_unit_type, "2 bedroom", "two bedroom", "2br"]
    );
    const selectDesiredLeaseTerm = textOrOptionChoice(
      field,
      [DEMO_PROFILE.desired_lease_term],
      [DEMO_PROFILE.desired_lease_term, "12 months", "12 month", "one year"]
    );
    const selectVoucherProgram = textOrOptionChoice(
      field,
      [DEMO_PROFILE.voucher_program],
      [DEMO_PROFILE.voucher_program, "none", "no voucher"]
    );
    const yesPets = yesNoChoice(field, DEMO_PROFILE.has_pets);
    const noSmoker = yesNoChoice(field, DEMO_PROFILE.smoker);
    const noSection8 = yesNoChoice(field, DEMO_PROFILE.section8);
    const noBankruptcy = yesNoChoice(field, DEMO_PROFILE.bankruptcy);
    const noEviction = yesNoChoice(field, DEMO_PROFILE.eviction);
    const noFelony = yesNoChoice(field, DEMO_PROFILE.felony);
    const noLateRent = yesNoChoice(field, DEMO_PROFILE.late_rent);
    const noCosigner = yesNoChoice(field, DEMO_PROFILE.cosigner);

    const isCoApplicant = matchesAny(text, [
      "co applicant",
      "co-applicant",
      "secondary applicant",
      "second applicant",
      "spouse"
    ]);
    const isEmergencyContact = matchesAny(text, ["emergency contact"]);
    const isReference = matchesAny(text, ["reference"]);
    const isPersonalReference = isReference && matchesAny(text, ["personal", "character", "friend"]);
    const isCurrentAddress = matchesAny(text, ["current address", "present address", "current residence", "present residence"]);
    const isPreviousAddress = matchesAny(text, ["previous address", "prior address", "former address", "last address"]);
    const isLandlord = matchesAny(text, ["landlord", "property manager", "leasing agent", "rental reference"]);
    const isCurrentEmployment = matchesAny(text, ["current employer", "current employment", "present employer", "present employment"]);
    const isPreviousEmployment = matchesAny(text, ["previous employer", "previous employment", "prior employer", "former employer"]);
    const isDependent = matchesAny(text, ["dependent", "child", "minor occupant"]);
    const isVehicle = matchesAny(text, ["vehicle", "car", "automobile", "license plate", "plate number"]);
    const isPet = matchesAny(text, ["pet", "animal", "dog", "cat", "breed"]);
    const isHousingPreference = matchesAny(text, ["move in", "lease term", "bedroom", "unit type", "desired rent", "parking", "storage"]);
    const isScreening = matchesAny(text, ["bankruptcy", "eviction", "felony", "late rent", "cosigner", "voucher", "section 8", "smoker"]);
    const isBanking = matchesAny(text, ["bank", "checking", "savings", "account type", "balance"]);

    if (isCoApplicant && matchesAny(text, ["full name", "legal name", "applicant name", "name"])) {
      return {
        value: DEMO_PROFILE.co_applicant_name,
        profile_key: "co_applicant.full_name",
        source_ref: "demo_profile.co_applicant.full_name",
        reason: "Housing co-applicant full name from the mock profile.",
        confidence: 0.94
      };
    }

    if (isCoApplicant && matchesAny(text, ["first name", "given name", "fname"])) {
      return {
        value: DEMO_PROFILE.co_applicant_first_name,
        profile_key: "co_applicant.first_name",
        source_ref: "demo_profile.co_applicant.first_name",
        reason: "Housing co-applicant first name from the mock profile.",
        confidence: 0.94
      };
    }

    if (isCoApplicant && matchesAny(text, ["last name", "surname", "lname"])) {
      return {
        value: DEMO_PROFILE.co_applicant_last_name,
        profile_key: "co_applicant.last_name",
        source_ref: "demo_profile.co_applicant.last_name",
        reason: "Housing co-applicant last name from the mock profile.",
        confidence: 0.94
      };
    }

    if (isCoApplicant && matchesAny(text, ["email", "e mail"])) {
      return {
        value: DEMO_PROFILE.co_applicant_email,
        profile_key: "co_applicant.email",
        source_ref: "demo_profile.co_applicant.email",
        reason: "Housing co-applicant email from the mock profile.",
        confidence: 0.92
      };
    }

    if (isCoApplicant && matchesAny(text, ["phone", "mobile", "telephone"])) {
      return {
        value: DEMO_PROFILE.co_applicant_phone,
        profile_key: "co_applicant.phone",
        source_ref: "demo_profile.co_applicant.phone",
        reason: "Housing co-applicant phone from the mock profile.",
        confidence: 0.9
      };
    }

    if (isCoApplicant && matchesAny(text, ["employer", "company", "organization"])) {
      return {
        value: DEMO_PROFILE.co_applicant_employer,
        profile_key: "co_applicant.employer_name",
        source_ref: "demo_profile.co_applicant.employer_name",
        reason: "Housing co-applicant employer from the mock profile.",
        confidence: 0.88
      };
    }

    if (isCoApplicant && matchesAny(text, ["job title", "position", "occupation", "role"])) {
      return {
        value: DEMO_PROFILE.co_applicant_job_title,
        profile_key: "co_applicant.job_title",
        source_ref: "demo_profile.co_applicant.job_title",
        reason: "Housing co-applicant job title from the mock profile.",
        confidence: 0.86
      };
    }

    if (isCoApplicant && matchesAny(text, ["monthly income"])) {
      return {
        value: DEMO_PROFILE.co_applicant_monthly_income,
        profile_key: "co_applicant.monthly_income",
        source_ref: "demo_profile.co_applicant.monthly_income",
        reason: "Housing co-applicant monthly income from the mock profile.",
        confidence: 0.9
      };
    }

    if (isCoApplicant && matchesAny(text, ["annual income", "yearly income", "salary"])) {
      return {
        value: DEMO_PROFILE.co_applicant_annual_income,
        profile_key: "co_applicant.annual_income",
        source_ref: "demo_profile.co_applicant.annual_income",
        reason: "Housing co-applicant annual income from the mock profile.",
        confidence: 0.9
      };
    }

    if (isEmergencyContact && matchesAny(text, ["relationship"])) {
      return {
        value: DEMO_PROFILE.emergency_contact_relationship,
        profile_key: "emergency_contact.relationship",
        source_ref: "demo_profile.emergency_contact.relationship",
        reason: "Emergency contact relationship from the housing mock profile.",
        confidence: 0.9
      };
    }

    if (isEmergencyContact && matchesAny(text, ["email", "e mail"])) {
      return {
        value: DEMO_PROFILE.emergency_contact_email,
        profile_key: "emergency_contact.email",
        source_ref: "demo_profile.emergency_contact.email",
        reason: "Emergency contact email from the housing mock profile.",
        confidence: 0.88
      };
    }

    if (isEmergencyContact && matchesAny(text, ["phone", "mobile", "telephone"])) {
      return {
        value: DEMO_PROFILE.emergency_contact_phone,
        profile_key: "emergency_contact.phone",
        source_ref: "demo_profile.emergency_contact.phone",
        reason: "Emergency contact phone from the housing mock profile.",
        confidence: 0.9
      };
    }

    if (isEmergencyContact && matchesAny(text, ["name", "contact"])) {
      return {
        value: DEMO_PROFILE.emergency_contact_name,
        profile_key: "emergency_contact.full_name",
        source_ref: "demo_profile.emergency_contact.full_name",
        reason: "Emergency contact name from the housing mock profile.",
        confidence: 0.92
      };
    }

    if (isPersonalReference && matchesAny(text, ["relationship"])) {
      return {
        value: DEMO_PROFILE.personal_reference_relationship,
        profile_key: "personal_reference.relationship",
        source_ref: "demo_profile.personal_reference.relationship",
        reason: "Personal reference relationship from the housing mock profile.",
        confidence: 0.86
      };
    }

    if (isPersonalReference && matchesAny(text, ["phone", "mobile", "telephone"])) {
      return {
        value: DEMO_PROFILE.personal_reference_phone,
        profile_key: "personal_reference.phone",
        source_ref: "demo_profile.personal_reference.phone",
        reason: "Personal reference phone from the housing mock profile.",
        confidence: 0.86
      };
    }

    if (isPersonalReference && matchesAny(text, ["email", "e mail"])) {
      return {
        value: DEMO_PROFILE.personal_reference_email,
        profile_key: "personal_reference.email",
        source_ref: "demo_profile.personal_reference.email",
        reason: "Personal reference email from the housing mock profile.",
        confidence: 0.84
      };
    }

    if (isPersonalReference && matchesAny(text, ["name", "reference"])) {
      return {
        value: DEMO_PROFILE.personal_reference_name,
        profile_key: "personal_reference.full_name",
        source_ref: "demo_profile.personal_reference.full_name",
        reason: "Personal reference name from the housing mock profile.",
        confidence: 0.88
      };
    }

    if (isCurrentAddress && matchesAny(text, ["address line 2", "suite", "apt", "apartment", "unit"])) {
      return {
        value: DEMO_PROFILE.current_address_line_2,
        profile_key: "current_address.line2",
        source_ref: "demo_profile.current_address.line2",
        reason: "Current address line 2 from the housing mock profile.",
        confidence: 0.9
      };
    }

    if (isCurrentAddress && matchesAny(text, ["address", "street"])) {
      return {
        value: DEMO_PROFILE.current_address_line_1,
        profile_key: "current_address.line1",
        source_ref: "demo_profile.current_address.line1",
        reason: "Current address line 1 from the housing mock profile.",
        confidence: 0.92
      };
    }

    if (isCurrentAddress && matchesAny(text, ["city", "town"])) {
      return {
        value: DEMO_PROFILE.current_city,
        profile_key: "current_address.city",
        source_ref: "demo_profile.current_address.city",
        reason: "Current city from the housing mock profile.",
        confidence: 0.9
      };
    }

    if (isCurrentAddress && matchesAny(text, ["state", "province", "region"])) {
      return {
        ...textOrOptionChoice(field, [DEMO_PROFILE.current_state], ["massachusetts", DEMO_PROFILE.current_state]),
        profile_key: "current_address.state",
        source_ref: "demo_profile.current_address.state",
        reason: "Current state from the housing mock profile.",
        confidence: 0.9
      };
    }

    if (isCurrentAddress && matchesAny(text, ["zip", "postal", "postcode"])) {
      return {
        value: DEMO_PROFILE.current_zip,
        profile_key: "current_address.zip",
        source_ref: "demo_profile.current_address.zip",
        reason: "Current ZIP code from the housing mock profile.",
        confidence: 0.9
      };
    }

    if (isCurrentAddress && matchesAny(text, ["move in", "residency start", "from date", "since"])) {
      return {
        value: DEMO_PROFILE.current_move_in_date,
        profile_key: "current_address.move_in_date",
        source_ref: "demo_profile.current_address.move_in_date",
        reason: "Current move-in date from the housing mock profile.",
        confidence: 0.86
      };
    }

    if (isPreviousAddress && matchesAny(text, ["address line 2", "suite", "apt", "apartment", "unit"])) {
      return {
        value: DEMO_PROFILE.previous_address_line_2,
        profile_key: "previous_address.line2",
        source_ref: "demo_profile.previous_address.line2",
        reason: "Previous address line 2 from the housing mock profile.",
        confidence: 0.88
      };
    }

    if (isPreviousAddress && matchesAny(text, ["address", "street"])) {
      return {
        value: DEMO_PROFILE.previous_address_line_1,
        profile_key: "previous_address.line1",
        source_ref: "demo_profile.previous_address.line1",
        reason: "Previous address line 1 from the housing mock profile.",
        confidence: 0.9
      };
    }

    if (isPreviousAddress && matchesAny(text, ["city", "town"])) {
      return {
        value: DEMO_PROFILE.previous_city,
        profile_key: "previous_address.city",
        source_ref: "demo_profile.previous_address.city",
        reason: "Previous city from the housing mock profile.",
        confidence: 0.88
      };
    }

    if (isPreviousAddress && matchesAny(text, ["state", "province", "region"])) {
      return {
        ...textOrOptionChoice(field, [DEMO_PROFILE.previous_state], ["massachusetts", DEMO_PROFILE.previous_state]),
        profile_key: "previous_address.state",
        source_ref: "demo_profile.previous_address.state",
        reason: "Previous state from the housing mock profile.",
        confidence: 0.88
      };
    }

    if (isPreviousAddress && matchesAny(text, ["zip", "postal", "postcode"])) {
      return {
        value: DEMO_PROFILE.previous_zip,
        profile_key: "previous_address.zip",
        source_ref: "demo_profile.previous_address.zip",
        reason: "Previous ZIP code from the housing mock profile.",
        confidence: 0.88
      };
    }

    if (isPreviousAddress && matchesAny(text, ["move in", "from date", "start"])) {
      return {
        value: DEMO_PROFILE.previous_move_in_date,
        profile_key: "previous_address.move_in_date",
        source_ref: "demo_profile.previous_address.move_in_date",
        reason: "Previous move-in date from the housing mock profile.",
        confidence: 0.82
      };
    }

    if (isPreviousAddress && matchesAny(text, ["move out", "to date", "end"])) {
      return {
        value: DEMO_PROFILE.previous_move_out_date,
        profile_key: "previous_address.move_out_date",
        source_ref: "demo_profile.previous_address.move_out_date",
        reason: "Previous move-out date from the housing mock profile.",
        confidence: 0.82
      };
    }

    if (isLandlord && isPreviousAddress && matchesAny(text, ["phone", "mobile", "telephone"])) {
      return {
        value: DEMO_PROFILE.previous_landlord_phone,
        profile_key: "previous_address.landlord_phone",
        source_ref: "demo_profile.previous_address.landlord_phone",
        reason: "Previous landlord phone from the housing mock profile.",
        confidence: 0.86
      };
    }

    if (isLandlord && isPreviousAddress && matchesAny(text, ["email", "e mail"])) {
      return {
        value: DEMO_PROFILE.previous_landlord_email,
        profile_key: "previous_address.landlord_email",
        source_ref: "demo_profile.previous_address.landlord_email",
        reason: "Previous landlord email from the housing mock profile.",
        confidence: 0.84
      };
    }

    if (isLandlord && isPreviousAddress && matchesAny(text, ["name", "company", "manager", "reference"])) {
      return {
        value: DEMO_PROFILE.previous_landlord_name,
        profile_key: "previous_address.landlord_name",
        source_ref: "demo_profile.previous_address.landlord_name",
        reason: "Previous landlord name from the housing mock profile.",
        confidence: 0.88
      };
    }

    if (isLandlord && matchesAny(text, ["phone", "mobile", "telephone"])) {
      return {
        value: DEMO_PROFILE.landlord_phone,
        profile_key: "current_address.landlord_phone",
        source_ref: "demo_profile.current_address.landlord_phone",
        reason: "Current landlord phone from the housing mock profile.",
        confidence: 0.88
      };
    }

    if (isLandlord && matchesAny(text, ["email", "e mail"])) {
      return {
        value: DEMO_PROFILE.landlord_email,
        profile_key: "current_address.landlord_email",
        source_ref: "demo_profile.current_address.landlord_email",
        reason: "Current landlord email from the housing mock profile.",
        confidence: 0.86
      };
    }

    if (isLandlord && matchesAny(text, ["name", "company", "manager", "reference"])) {
      return {
        value: DEMO_PROFILE.landlord_name,
        profile_key: "current_address.landlord_name",
        source_ref: "demo_profile.current_address.landlord_name",
        reason: "Current landlord name from the housing mock profile.",
        confidence: 0.9
      };
    }

    if (matchesAny(text, ["monthly rent", "rent amount", "current rent"])) {
      return {
        value: DEMO_PROFILE.monthly_rent,
        profile_key: "current_address.monthly_rent",
        source_ref: "demo_profile.current_address.monthly_rent",
        reason: "Current monthly rent from the housing mock profile.",
        confidence: 0.9
      };
    }

    if (matchesAny(text, ["reason for leaving", "reason for moving", "why are you moving"])) {
      return {
        value: DEMO_PROFILE.reason_for_leaving,
        profile_key: "current_address.reason_for_leaving",
        source_ref: "demo_profile.current_address.reason_for_leaving",
        reason: "Reason for leaving from the housing mock profile.",
        confidence: 0.86
      };
    }

    if ((isCurrentEmployment || matchesAny(text, ["employer", "employment"])) && matchesAny(text, ["company", "employer", "organization", "business"])) {
      return {
        value: DEMO_PROFILE.employer_name,
        profile_key: "current_employment.employer_name",
        source_ref: "demo_profile.current_employment.employer_name",
        reason: "Current employer from the housing mock profile.",
        confidence: 0.9
      };
    }

    if ((isCurrentEmployment || matchesAny(text, ["occupation", "job title", "position"])) && matchesAny(text, ["job title", "position", "occupation", "role"])) {
      return {
        value: DEMO_PROFILE.position,
        profile_key: "current_employment.job_title",
        source_ref: "demo_profile.current_employment.job_title",
        reason: "Current job title from the housing mock profile.",
        confidence: 0.88
      };
    }

    if ((isCurrentEmployment || matchesAny(text, ["employment start", "date employed"])) && matchesAny(text, ["start date", "date employed", "since"])) {
      return {
        value: DEMO_PROFILE.employment_start_date,
        profile_key: "current_employment.start_date",
        source_ref: "demo_profile.current_employment.start_date",
        reason: "Current employment start date from the housing mock profile.",
        confidence: 0.84
      };
    }

    if (matchesAny(text, ["supervisor"]) && matchesAny(text, ["phone", "mobile", "telephone"])) {
      return {
        value: DEMO_PROFILE.supervisor_phone,
        profile_key: "current_employment.supervisor_phone",
        source_ref: "demo_profile.current_employment.supervisor_phone",
        reason: "Supervisor phone from the housing mock profile.",
        confidence: 0.84
      };
    }

    if (matchesAny(text, ["supervisor"]) && matchesAny(text, ["email", "e mail"])) {
      return {
        value: DEMO_PROFILE.supervisor_email,
        profile_key: "current_employment.supervisor_email",
        source_ref: "demo_profile.current_employment.supervisor_email",
        reason: "Supervisor email from the housing mock profile.",
        confidence: 0.82
      };
    }

    if (matchesAny(text, ["supervisor", "manager"]) && matchesAny(text, ["name", "contact"])) {
      return {
        value: DEMO_PROFILE.supervisor_name,
        profile_key: "current_employment.supervisor_name",
        source_ref: "demo_profile.current_employment.supervisor_name",
        reason: "Supervisor name from the housing mock profile.",
        confidence: 0.86
      };
    }

    if (isPreviousEmployment && matchesAny(text, ["company", "employer", "organization", "business"])) {
      return {
        value: DEMO_PROFILE.previous_employer_name,
        profile_key: "previous_employment.employer_name",
        source_ref: "demo_profile.previous_employment.employer_name",
        reason: "Previous employer from the housing mock profile.",
        confidence: 0.84
      };
    }

    if (isPreviousEmployment && matchesAny(text, ["job title", "position", "occupation", "role"])) {
      return {
        value: DEMO_PROFILE.previous_job_title,
        profile_key: "previous_employment.job_title",
        source_ref: "demo_profile.previous_employment.job_title",
        reason: "Previous job title from the housing mock profile.",
        confidence: 0.82
      };
    }

    if (isPreviousEmployment && matchesAny(text, ["start date", "date employed", "from"])) {
      return {
        value: DEMO_PROFILE.previous_employment_start_date,
        profile_key: "previous_employment.start_date",
        source_ref: "demo_profile.previous_employment.start_date",
        reason: "Previous employment start date from the housing mock profile.",
        confidence: 0.8
      };
    }

    if (isPreviousEmployment && matchesAny(text, ["end date", "to date", "until"])) {
      return {
        value: DEMO_PROFILE.previous_employment_end_date,
        profile_key: "previous_employment.end_date",
        source_ref: "demo_profile.previous_employment.end_date",
        reason: "Previous employment end date from the housing mock profile.",
        confidence: 0.8
      };
    }

    if (matchesAny(text, ["total monthly income", "combined monthly income"])) {
      return {
        value: DEMO_PROFILE.total_monthly_income,
        profile_key: "current_employment.total_monthly_income",
        source_ref: "demo_profile.current_employment.total_monthly_income",
        reason: "Total monthly income from the housing mock profile.",
        confidence: 0.9,
        requires_review: true
      };
    }

    if (matchesAny(text, ["additional income", "other income", "supplemental income"])) {
      return {
        value: DEMO_PROFILE.additional_income,
        profile_key: "current_employment.additional_income",
        source_ref: "demo_profile.current_employment.additional_income",
        reason: "Additional income from the housing mock profile.",
        confidence: 0.78,
        requires_review: true
      };
    }

    if (matchesAny(text, ["monthly income", "gross monthly", "income per month"])) {
      return {
        value: DEMO_PROFILE.monthly_income,
        profile_key: "current_employment.monthly_income",
        source_ref: "demo_profile.current_employment.monthly_income",
        reason: "Monthly income from the housing mock profile.",
        confidence: 0.88,
        requires_review: true
      };
    }

    if (matchesAny(text, ["annual income", "yearly income", "salary", "gross annual"])) {
      return {
        value: DEMO_PROFILE.annual_income || DEMO_PROFILE.income,
        profile_key: "current_employment.annual_income",
        source_ref: "demo_profile.current_employment.annual_income",
        reason: "Annual income from the housing mock profile.",
        confidence: 0.84,
        requires_review: true
      };
    }

    if (isDependent && matchesAny(text, ["relationship"])) {
      return {
        value: DEMO_PROFILE.dependent_relationship,
        profile_key: "household.dependent_relationship",
        source_ref: "demo_profile.household.dependent_relationship",
        reason: "Dependent relationship from the housing mock profile.",
        confidence: 0.84
      };
    }

    if (isDependent && matchesAny(text, ["date of birth", "dob", "birthday"])) {
      return {
        value: DEMO_PROFILE.dependent_dob,
        profile_key: "household.dependent_dob",
        source_ref: "demo_profile.household.dependent_dob",
        reason: "Dependent date of birth from the housing mock profile.",
        confidence: 0.78,
        requires_review: true
      };
    }

    if (isDependent && matchesAny(text, ["first name", "given name"])) {
      return {
        value: DEMO_PROFILE.dependent_first_name,
        profile_key: "household.dependent_first_name",
        source_ref: "demo_profile.household.dependent_first_name",
        reason: "Dependent first name from the housing mock profile.",
        confidence: 0.86
      };
    }

    if (isDependent && matchesAny(text, ["last name", "surname"])) {
      return {
        value: DEMO_PROFILE.dependent_last_name,
        profile_key: "household.dependent_last_name",
        source_ref: "demo_profile.household.dependent_last_name",
        reason: "Dependent last name from the housing mock profile.",
        confidence: 0.86
      };
    }

    if (isDependent && matchesAny(text, ["name", "occupant"])) {
      return {
        value: DEMO_PROFILE.dependent_name,
        profile_key: "household.dependent_name",
        source_ref: "demo_profile.household.dependent_name",
        reason: "Dependent name from the housing mock profile.",
        confidence: 0.88
      };
    }

    if (matchesAny(text, ["number of occupants", "occupants", "household size"])) {
      return {
        value: DEMO_PROFILE.occupants,
        profile_key: "household.occupants",
        source_ref: "demo_profile.household.occupants",
        reason: "Household size from the housing mock profile.",
        confidence: 0.9
      };
    }

    if (matchesAny(text, ["number of adults", "adult occupants", "adults"])) {
      return {
        value: DEMO_PROFILE.adults,
        profile_key: "household.adults",
        source_ref: "demo_profile.household.adults",
        reason: "Adult count from the housing mock profile.",
        confidence: 0.88
      };
    }

    if (matchesAny(text, ["number of children", "children", "minors"])) {
      return {
        value: DEMO_PROFILE.children,
        profile_key: "household.children",
        source_ref: "demo_profile.household.children",
        reason: "Child count from the housing mock profile.",
        confidence: 0.88
      };
    }

    if (isVehicle && matchesAny(text, ["make"])) {
      return {
        value: DEMO_PROFILE.vehicle_make,
        profile_key: "vehicle.make",
        source_ref: "demo_profile.vehicle.make",
        reason: "Vehicle make from the housing mock profile.",
        confidence: 0.86
      };
    }

    if (isVehicle && matchesAny(text, ["model"])) {
      return {
        value: DEMO_PROFILE.vehicle_model,
        profile_key: "vehicle.model",
        source_ref: "demo_profile.vehicle.model",
        reason: "Vehicle model from the housing mock profile.",
        confidence: 0.86
      };
    }

    if (isVehicle && matchesAny(text, ["year"])) {
      return {
        value: DEMO_PROFILE.vehicle_year,
        profile_key: "vehicle.year",
        source_ref: "demo_profile.vehicle.year",
        reason: "Vehicle year from the housing mock profile.",
        confidence: 0.84
      };
    }

    if (isVehicle && matchesAny(text, ["color", "colour"])) {
      return {
        value: DEMO_PROFILE.vehicle_color,
        profile_key: "vehicle.color",
        source_ref: "demo_profile.vehicle.color",
        reason: "Vehicle color from the housing mock profile.",
        confidence: 0.84
      };
    }

    if (isVehicle && matchesAny(text, ["plate", "license plate", "registration"])) {
      return {
        value: DEMO_PROFILE.license_plate,
        profile_key: "vehicle.license_plate",
        source_ref: "demo_profile.vehicle.license_plate",
        reason: "Vehicle license plate from the housing mock profile.",
        confidence: 0.82
      };
    }

    if (matchesAny(text, ["do you have pets", "pets allowed", "has pets", "pet owner"])) {
      return {
        ...yesPets,
        profile_key: "pet.has_pets",
        source_ref: "demo_profile.pet.has_pets",
        reason: "Pet household indicator from the housing mock profile.",
        confidence: 0.84
      };
    }

    if (isPet && matchesAny(text, ["breed"])) {
      return {
        value: DEMO_PROFILE.pet_breed,
        profile_key: "pet.breed",
        source_ref: "demo_profile.pet.breed",
        reason: "Pet breed from the housing mock profile.",
        confidence: 0.84
      };
    }

    if (isPet && matchesAny(text, ["weight"])) {
      return {
        value: DEMO_PROFILE.pet_weight,
        profile_key: "pet.weight",
        source_ref: "demo_profile.pet.weight",
        reason: "Pet weight from the housing mock profile.",
        confidence: 0.82
      };
    }

    if (isPet && matchesAny(text, ["type", "kind"])) {
      return {
        value: DEMO_PROFILE.pet_type,
        profile_key: "pet.type",
        source_ref: "demo_profile.pet.type",
        reason: "Pet type from the housing mock profile.",
        confidence: 0.86
      };
    }

    if (isPet && matchesAny(text, ["name"])) {
      return {
        value: DEMO_PROFILE.pet_name,
        profile_key: "pet.name",
        source_ref: "demo_profile.pet.name",
        reason: "Pet name from the housing mock profile.",
        confidence: 0.84
      };
    }

    if (matchesAny(text, ["marital status"])) {
      return {
        ...selectMaritalStatus,
        profile_key: "applicant.marital_status",
        source_ref: "demo_profile.applicant.marital_status",
        reason: "Marital status from the housing mock profile.",
        confidence: 0.82
      };
    }

    if (matchesAny(text, ["citizenship", "resident status", "immigration status"])) {
      return {
        ...selectCitizenshipStatus,
        profile_key: "applicant.citizenship_status",
        source_ref: "demo_profile.applicant.citizenship_status",
        reason: "Citizenship status from the housing mock profile.",
        confidence: 0.8,
        requires_review: true
      };
    }

    if (matchesAny(text, ["move in date", "desired move in", "requested occupancy date"])) {
      return {
        value: DEMO_PROFILE.desired_move_in_date,
        profile_key: "application_preferences.desired_move_in_date",
        source_ref: "demo_profile.application_preferences.desired_move_in_date",
        reason: "Desired move-in date from the housing mock profile.",
        confidence: 0.9
      };
    }

    if (isHousingPreference && matchesAny(text, ["lease term", "lease length"])) {
      return {
        ...selectDesiredLeaseTerm,
        profile_key: "application_preferences.desired_lease_term",
        source_ref: "demo_profile.application_preferences.desired_lease_term",
        reason: "Desired lease term from the housing mock profile.",
        confidence: 0.84
      };
    }

    if (isHousingPreference && matchesAny(text, ["unit type", "apartment type", "bedroom", "home type"])) {
      return {
        ...selectDesiredUnitType,
        profile_key: "application_preferences.desired_unit_type",
        source_ref: "demo_profile.application_preferences.desired_unit_type",
        reason: "Desired unit type from the housing mock profile.",
        confidence: 0.88
      };
    }

    if (matchesAny(text, ["desired rent", "budget", "max rent"])) {
      return {
        value: DEMO_PROFILE.desired_rent,
        profile_key: "application_preferences.desired_rent",
        source_ref: "demo_profile.application_preferences.desired_rent",
        reason: "Desired rent from the housing mock profile.",
        confidence: 0.84
      };
    }

    if (matchesAny(text, ["parking", "parking spaces", "parking needed"])) {
      return {
        value: DEMO_PROFILE.parking_needed,
        profile_key: "application_preferences.parking_needed",
        source_ref: "demo_profile.application_preferences.parking_needed",
        reason: "Parking preference from the housing mock profile.",
        confidence: 0.8
      };
    }

    if (matchesAny(text, ["storage", "storage needed"])) {
      return {
        value: DEMO_PROFILE.storage_needed,
        profile_key: "application_preferences.storage_needed",
        source_ref: "demo_profile.application_preferences.storage_needed",
        reason: "Storage preference from the housing mock profile.",
        confidence: 0.8
      };
    }

    if (matchesAny(text, ["smoker", "smoking"])) {
      return {
        ...noSmoker,
        profile_key: "application_preferences.smoker",
        source_ref: "demo_profile.application_preferences.smoker",
        reason: "Smoking status from the housing mock profile.",
        confidence: 0.82
      };
    }

    if (matchesAny(text, ["section 8", "section8"])) {
      return {
        ...noSection8,
        profile_key: "application_preferences.section8",
        source_ref: "demo_profile.application_preferences.section8",
        reason: "Section 8 status from the housing mock profile.",
        confidence: 0.8
      };
    }

    if (matchesAny(text, ["voucher", "housing voucher"])) {
      return {
        ...selectVoucherProgram,
        profile_key: "application_preferences.voucher_program",
        source_ref: "demo_profile.application_preferences.voucher_program",
        reason: "Voucher program from the housing mock profile.",
        confidence: 0.8
      };
    }

    if (isScreening && matchesAny(text, ["bankruptcy"])) {
      return {
        ...noBankruptcy,
        profile_key: "screening.bankruptcy",
        source_ref: "demo_profile.screening.bankruptcy",
        reason: "Bankruptcy history from the housing mock profile.",
        confidence: 0.78,
        requires_review: true
      };
    }

    if (isScreening && matchesAny(text, ["eviction"])) {
      return {
        ...noEviction,
        profile_key: "screening.eviction",
        source_ref: "demo_profile.screening.eviction",
        reason: "Eviction history from the housing mock profile.",
        confidence: 0.78,
        requires_review: true
      };
    }

    if (isScreening && matchesAny(text, ["felony", "criminal"])) {
      return {
        ...noFelony,
        profile_key: "screening.felony",
        source_ref: "demo_profile.screening.felony",
        reason: "Criminal-history answer from the housing mock profile.",
        confidence: 0.76,
        requires_review: true
      };
    }

    if (isScreening && matchesAny(text, ["late rent", "late payment"])) {
      return {
        ...noLateRent,
        profile_key: "screening.late_rent",
        source_ref: "demo_profile.screening.late_rent",
        reason: "Late-rent history from the housing mock profile.",
        confidence: 0.76,
        requires_review: true
      };
    }

    if (isScreening && matchesAny(text, ["cosigner", "guarantor"])) {
      return {
        ...noCosigner,
        profile_key: "screening.cosigner",
        source_ref: "demo_profile.screening.cosigner",
        reason: "Cosigner requirement from the housing mock profile.",
        confidence: 0.76
      };
    }

    if (isBanking && matchesAny(text, ["bank name", "financial institution"])) {
      return {
        value: DEMO_PROFILE.bank_name,
        profile_key: "banking.bank_name",
        source_ref: "demo_profile.banking.bank_name",
        reason: "Bank name from the housing mock profile.",
        confidence: 0.8
      };
    }

    if (isBanking && matchesAny(text, ["account type"])) {
      return {
        ...textOrOptionChoice(field, [DEMO_PROFILE.account_type], [DEMO_PROFILE.account_type, "checking"]),
        profile_key: "banking.account_type",
        source_ref: "demo_profile.banking.account_type",
        reason: "Account type from the housing mock profile.",
        confidence: 0.78
      };
    }

    if (isBanking && matchesAny(text, ["checking", "last four", "account ending"])) {
      return {
        value: DEMO_PROFILE.checking_last_four,
        profile_key: "banking.checking_last_four",
        source_ref: "demo_profile.banking.checking_last_four",
        reason: "Checking-account last four from the housing mock profile.",
        confidence: 0.74,
        requires_review: true
      };
    }

    if (isBanking && matchesAny(text, ["balance", "available funds"])) {
      return {
        value: DEMO_PROFILE.available_balance,
        profile_key: "banking.available_balance",
        source_ref: "demo_profile.banking.available_balance",
        reason: "Available balance from the housing mock profile.",
        confidence: 0.72,
        requires_review: true
      };
    }

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
