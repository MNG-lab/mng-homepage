import {reportRequestResult} from './request-result.mjs';
import {rollbackFailureCodes} from '../shared/request-failure.js';
const issue=Number(process.env.REQUEST_ISSUE),reason=process.env.REQUEST_RESULT,failureCode=process.env.REQUEST_FAILURE_CODE||null;
if(process.env.GITHUB_REPOSITORY!=='MNG-lab/mng-homepage'||process.env.GITHUB_REF!=='refs/heads/main'||!Number.isSafeInteger(issue)||issue<1||!['success','failed'].includes(reason)||failureCode&&(!rollbackFailureCodes.includes(failureCode)||reason!=='failed'))throw Error('Invalid rollback result');
await reportRequestResult({issue,reason,failureCode});
