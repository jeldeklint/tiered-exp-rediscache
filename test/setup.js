import "mocha-cakes-2";
import { expect } from "chai";

process.env.NODE_ENV = "test";
process.env.TZ = "Europe/Stockholm";

global.expect = expect;
