// Copyright (c) 2022 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@mui/material";
import classnames from "classnames";
import { useLedger, useParty } from "@daml/react";
import { emptyMap } from "@daml/types";
import useStyles from "../../styles";
import { parseDate, singleton } from "../../../util";
import { Spinner } from "../../../components/Spinner/Spinner";
import { PeriodEnum } from "@daml.js/daml-finance-interface-types-date/lib/Daml/Finance/Interface/Types/Date/RollConvention";
import { DayCountConventionEnum } from "@daml.js/daml-finance-interface-types-date/lib/Daml/Finance/Interface/Types/Date/DayCount";
import { BusinessDayConventionEnum } from "@daml.js/daml-finance-interface-types-date/lib/Daml/Finance/Interface/Types/Date/Calendar";
import { useParties } from "../../../context/PartiesContext";
import { useInstruments } from "../../../context/InstrumentContext";
import { useServices } from "../../../context/ServicesContext";
import { Service as Structuring } from "@daml.js/daml-finance-app/lib/Daml/Finance/App/Interface/Structuring/Service";
import { Service as StructuringAuto } from "@daml.js/daml-finance-app/lib/Daml/Finance/App/Interface/Structuring/Auto";
import { CenteredForm } from "../../../components/CenteredForm/CenteredForm";
import { TextInput } from "../../../components/Form/TextInput";
import { SelectInput, toValues } from "../../../components/Form/SelectInput";
import { DateInput } from "../../../components/Form/DateInput";
import { ToggleInput } from "../../../components/Form/ToggleInput";
import { businessDayConventions, couponFrequencies, dayCountConventions, holidayCalendars, inflationIndices } from "./util";

export const NewInflationLinkedBond : React.FC = () => {
  const cls = useStyles();
  const navigate = useNavigate();

  const [ id, setId ] = useState("");
  const [ description, setDescription ] = useState("");
  const [ inflationIndexId, setInflationIndexId ] = useState("");
  const [ inflationIndexBaseValue, setInflationIndexBaseValue ] = useState("");
  const [ couponRate, setCouponRate ] = useState("");
  const [ issueDate, setIssueDate ] = useState<Date | null>(null);
  const [ firstCouponDate, setFirstCouponDate ] = useState<Date | null>(null);
  const [ maturityDate, setMaturityDate ] = useState<Date | null>(null);
  const [ holidayCalendar, setHolidayCalendar ] = useState("");
  const [ dayCountConvention, setDayCountConvention ] = useState("");
  const [ businessDayConvention, setBusinessDayConvention ] = useState("");
  const [ couponFrequency, setCouponFrequency ] = useState("Annual");
  const [ currency, setCurrency ] = useState("");

  const canRequest = !!id && !!inflationIndexId && !!inflationIndexBaseValue && !!couponRate && !!issueDate && !!firstCouponDate && !!maturityDate && !!dayCountConvention && businessDayConvention && !!couponFrequency && !!currency;

  const ledger = useLedger();
  const party = useParty();
  const { getParty } = useParties();
  const { loading: l1, structuring, structuringAuto } = useServices();
  const { loading: l2, tokens } = useInstruments();

  if (l1 || l2) return <Spinner />;

  const createInflationLinkedBond = async () => {
    const ccy = tokens.find(c => c.payload.id.unpack === currency);
    if (!ccy) throw new Error("Couldn't find currency " + currency);
    const couponPeriod = couponFrequency === "Annual" ? PeriodEnum.Y : PeriodEnum.M;
    const couponPeriodMultiplier = couponFrequency === "Annual" ? "1" : (couponFrequency === "Semi-annual" ? "6" : "3");
    const arg = {
      id: { unpack: id },
      description,
      version: uuidv4(),
      inflationIndexId,
      inflationIndexBaseValue,
      couponRate,
      issueDate: parseDate(issueDate),
      firstCouponDate: parseDate(firstCouponDate),
      maturityDate: parseDate(maturityDate),
      holidayCalendarIds: holidayCalendar === "" ? [] : [holidayCalendar],
      calendarDataProvider: party,
      dayCountConvention: dayCountConvention as DayCountConventionEnum,
      businessDayConvention: businessDayConvention as BusinessDayConventionEnum,
      couponPeriod,
      couponPeriodMultiplier,
      currency: ccy.key,
      observers: emptyMap<string, any>().set("Public", singleton(getParty("Public"))),
      lastEventTimestamp: new Date().toISOString()
    };
    // TODO: Assumes single service
    const svc = structuring.services[0];
    const auto = structuringAuto.services[0];
    if (!svc) throw new Error("No structuring service found for customer [" + party + "]");
    if (!!auto) await ledger.exercise(StructuringAuto.RequestAndCreateInflationLinkedBond, auto.service.contractId, arg);
    else await ledger.exercise(Structuring.RequestCreateInflationLinkedBond, svc.service.contractId, arg);
    navigate("/app/structuring/instruments");
  };

  return (
    <CenteredForm title= "New Inflation Linked Bond">
      <TextInput    label="Id"                          value={id}                      setValue={setId} />
      <TextInput    label="Description"                 value={description}             setValue={setDescription} />
      <SelectInput  label="Inflation Index"             value={inflationIndexId}        setValue={setInflationIndexId}        values={inflationIndices} />
      <TextInput    label="Inflation Index Base Value"  value={inflationIndexBaseValue} setValue={setInflationIndexBaseValue} />
      <TextInput    label="Coupon (per annum)"          value={couponRate}              setValue={setCouponRate} />
      <SelectInput  label="Currency"                    value={currency}                setValue={setCurrency}                values={toValues(tokens)} />
      <DateInput    label="Issue Date"                  value={issueDate}               setValue={setIssueDate} />
      <DateInput    label="First Coupon Date"           value={firstCouponDate}         setValue={setFirstCouponDate} />
      <DateInput    label="Maturity Date"               value={maturityDate}            setValue={setMaturityDate} />
      <ToggleInput  label="Coupon Frequency"            value={couponFrequency}         setValue={setCouponFrequency}         values={couponFrequencies} />
      <SelectInput  label="Day Count Convention"        value={dayCountConvention}      setValue={setDayCountConvention}      values={dayCountConventions} />
      <SelectInput  label="Business Day Adjustment"     value={businessDayConvention}   setValue={setBusinessDayConvention}   values={businessDayConventions} />
      <SelectInput  label="Holiday Calendar"            value={holidayCalendar}         setValue={setHolidayCalendar}         values={holidayCalendars} />
      <Button className={classnames(cls.fullWidth, cls.buttonMargin)} size="large" variant="contained" color="primary" disabled={!canRequest} onClick={createInflationLinkedBond}>Create Instrument</Button>
    </CenteredForm>
  );
};
