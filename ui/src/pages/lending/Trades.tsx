// Copyright (c) 2022 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { Button } from "@mui/material";
import { useLedger, useParty, useStreamQueries } from "@daml/react";
import useStyles from "../styles";
import { Spinner } from "../../components/Spinner/Spinner";
import { useParties } from "../../context/PartiesContext";
import { BorrowAgreement } from "@daml.js/daml-finance-app-interface-lending/lib/Daml/Finance/App/Interface/Lending/BorrowAgreement";
import { fmt } from "../../util";
import { CreateEvent } from "@daml/ledger";
import { useHoldings } from "../../context/HoldingContext";
import { ContractId } from "@daml/types";
import { Transferable } from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Transferable";
import { HorizontalTable } from "../../components/Table/HorizontalTable";

export const Trades : React.FC = () => {
  const classes = useStyles();
  const party = useParty();
  const ledger = useLedger();
  const { getName } = useParties();
  const { loading: l1, getFungible } = useHoldings();
  const { loading: l2, contracts: trades } = useStreamQueries(BorrowAgreement);
  if (l1 || l2) return <Spinner />;

  const repay = async (deal : CreateEvent<BorrowAgreement>) => {
    const borrowedCid = await getFungible(party, deal.payload.borrowed.amount, deal.payload.borrowed.unit);
    const interestCid = await getFungible(party, deal.payload.interest.amount, deal.payload.interest.unit);
    const arg = {
      borrowedCid: borrowedCid as string as ContractId<Transferable>,
      interestCid: interestCid as string as ContractId<Transferable>
    };
    await ledger.exercise(BorrowAgreement.Repay, deal.contractId, arg);
  };

  const createRow = (c : CreateEvent<BorrowAgreement>) : any[] => {
    return [
      getName(c.payload.customer),
      getName(c.payload.provider),
      c.payload.dealId.unpack,
      fmt(c.payload.borrowed.amount, 0) + " " + c.payload.borrowed.unit.id.unpack,
      c.payload.maturity,
      fmt(c.payload.interest.amount, 0) + " " + c.payload.interest.unit.id.unpack,
      fmt(c.payload.collateral.amount, 0) + " " + c.payload.collateral.unit.id.unpack,
      c.payload.customer === party ? <Button color="primary" size="small" className={classes.choiceButton} variant="contained" onClick={() => repay(c)}>Repay</Button> : <></>
    ];
  }
  const headers = ["Borrower", "Lender", "Id", "Borrowed", "Maturity", "Interest", "Collateral", "Action"]
  const values : any[] = trades.map(createRow);
  return (
    <HorizontalTable title="Live Trades" variant={"h3"} headers={headers} values={values} />
  );
};
