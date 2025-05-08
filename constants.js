"use strict";
/**
 * Detects the browser name from the navigator object
 * @returns {string|undefined} - 'chrome', 'firefox', 'safari', or undefined
 */
function detectBrowser() {
  const userAgent = navigator.userAgent.toLowerCase();
  // Firefox detection (including Firefox-based browsers)
  if (userAgent.indexOf('firefox') !== -1) {
    return 'firefox';
  }
  // Chrome detection (including Edge and other Chromium-based browsers)
  if (userAgent.indexOf('chrome') !== -1 || userAgent.indexOf('edg') !== -1) {
    return 'chrome';
  }
  // Safari detection (after checking for Chrome since Chrome includes "safari" in its user agent)
  if (userAgent.indexOf('safari') !== -1) {
    return 'safari';
  }
    return undefined;
}
export const BROWSER_NAME = detectBrowser();
export const ISCHROME = BROWSER_NAME === "chrome";
export const ISFIREFOX = BROWSER_NAME === "firefox";
export const ISSAFARI = BROWSER_NAME === "safari";
export const BROWSER = ISCHROME ? chrome : browser;
export const EXTENSION_LABEL = BROWSER.i18n.getMessage("extension_label");
export const EXTENSION_NAME = "again-why-salesforce";
export const SETUP_LIGHTNING = "/lightning/setup/";
export const WHY_KEY = "againWhySalesforce";
export const LOCALE_KEY = "_locale";
const PROTOCOL_SEPARATOR = "://";
export const HTTPS = `https${PROTOCOL_SEPARATOR}`;
export const LIGHTNING_FORCE_COM = ".lightning.force.com";
export const MY_SALESFORCE_SETUP_COM = ".my.salesforce-setup.com";
export const MY_SALESFORCE_COM = ".my.salesforce.com";
export const SUPPORTED_SALESFORCE_URLS = [
	LIGHTNING_FORCE_COM,
	MY_SALESFORCE_SETUP_COM,
	MY_SALESFORCE_COM,
];
//export const API_VERSION = "v60.0";
// source: https://www.fishofprey.com/2011/09/obscure-salesforce-object-key-prefixes.html
const SALESFORCE_ID_PREFIX =
	"000|001|002|003|005|006|007|008|00A|00B|00C|00D|00E|00F|00G|00I|00I|00I|00J|00K|00M|00N|00O|00P|00Q|00R|00S|00T|00U|00X|00Y|00a|00a|00a|00b|00c|00d|00e|00f|00g|00h|00i|00j|00k|00l|00m|00n|00o|00p|00q|00r|00s|00t|00u|00v|00w|00x|00y|00z|010|011|012|013|014|015|016|017|018|019|01A|01B|01C|01D|01E|01G|01H|01I|01J|01J|01J|01K|01L|01M|01N|01O|01P|01Q|01Q|01R|01S|01T|01U|01V|01W|01X|01Y|01Z|01a|01b|01c|01d|01e|01f|01g|01h|01i|01j|01k|01l|01m|01n|01o|01p|01q|01r|01s|01t|01u|01v|01w|01x|01y|01z|020|021|022|023|024|025|026|027|028|029|02A|02B|02C|02D|02E|02F|02G|02H|02I|02J|02K|02L|02M|02N|02O|02P|02Q|02R|02S|02T|02U|02V|02W|02X|02Y|02Z|02a|02b|02c|02c|02c|02d|02e|02f|02g|02h|02i|02j|02k|02l|02m|02n|02o|02p|02q|02r|02s|02t|02u|02v|02w|02x|02y|02z|030|031|032|033|033|034|035|036|037|038|039|03A|03B|03C|03D|03E|03G|03H|03I|03J|03K|03L|03M|03N|03O|03P|03Q|03R|03S|03U|03V|03Y|03Z|03a|03b|03c|03d|03e|03f|03g|03h|03i|03j|03k|03m|03n|03o|03q|03r|03s|03u|03v|040|041|042|043|044|045|049|04B|04E|04F|04G|04H|04I|04P|04Q|04R|04S|04T|04U|04V|04W|04X|04Y|04Z|04a|04b|04c|04d|04e|04f|04g|04h|04i|04j|04k|04l|04m|04n|04o|04p|04q|04r|04s|04t|04t|04u|04v|04w|04x|04y|04z|050|051|052|053|054|055|056|057|058|059|05A|05B|05C|05D|05E|05F|05G|05H|05I|05J|05K|05L|05M|05N|05P|05Q|05R|05S|05T|05U|05V|05W|05X|05Z|05a|05c|05d|05e|05f|05g|05i|05j|05k|05l|05m|05n|05o|05p|05q|05t|05v|05y|05z|060|061|062|063|064|065|066|067|068|069|069|06A|06B|06E|06F|06G|06M|06N|06O|06P|06V|06W|06Y|06a|06b|06c|06d|06e|06f|06g|06h|06i|06j|06k|06l|06m|06n|06o|06p|06q|06r|06s|06t|06u|06v|06w|06y|070|071|072|073|074|075|076|077|078|079|07A|07D|07E|07F|07G|07H|07I|07J|07K|07L|07M|07N|07O|07P|07R|07S|07T|07U|07V|07W|07X|07Y|07Z|07a|07b|07c|07d|07e|07f|07g|07h|07i|07j|07k|07l|07m|07n|07o|07p|07t|07u|07v|07w|07x|07y|07z|080|081|082|083|084|085|086|087|08C|08E|08F|08G|08H|08I|08J|08K|08M|08N|08O|08P|08Q|08R|08U|08V|08W|08X|08a|08c|08d|08e|08g|08h|08j|08k|08l|08n|08o|08p|08q|08r|08s|08t|08u|08v|08x|08y|090|091|092|093|094|095|096|097|098|099|09A|09B|09C|09D|09E|09F|09G|09H|09I|09J|09K|09L|09M|09N|09O|09P|09S|09T|09U|09V|09W|09X|09Y|09Z|09a|09d|09e|09f|09g|09h|09i|09j|09k|09l|09m|09s|09t|09v|09w|09x|09z|0A0|0A1|0A2|0A3|0A4|0A5|0A7|0A8|0A9|0AB|0AD|0AF|0AH|0AI|0AJ|0AK|0AL|0AM|0AN|0AO|0AP|0AQ|0AR|0AS|0AT|0AU|0AV|0AW|0AX|0AY|0AZ|0Aa|0Ab|0Ad|0Af|0Ag|0Ah|0Ai|0Aj|0Ak|0Al|0Am|0An|0Ao|0Ap|0Aq|0Ar|0As|0At|0Au|0Av|0Aw|0Ax|0Ay|0Az|0B0|0B1|0B2|0B3|0B9|0BA|0BB|0BC|0BE|0BF|0BG|0BH|0BI|0BJ|0BL|0BM|0BR|0BV|0BW|0BX|0BY|0BZ|0Ba|0Bb|0Bc|0Bd|0Be|0Bf|0Bg|0Bi|0Bk|0Bl|0Bm|0Bn|0Bo|0Bp|0Bq|0Br|0Bs|0Bt|0Bu|0Bv|0Bw|0Bx|0By|0Bz|0C0|0C1|0C2|0C3|0C5|0C6|0C8|0C9|0CA|0CB|0CC|0CD|0CE|0CF|0CG|0CH|0CI|0CJ|0CK|0CL|0CM|0CO|0CP|0CQ|0CS|0CU|0CW|0CX|0CZ|0Cd|0Ce|0Cg|0Ch|0Ci|0Cj|0Cl|0Cn|0Co|0Ct|0Cu|0Cv|0Cw|0Cy|0Cz|0D0|0D1|0D2|0D3|0D4|0D5|0D6|0D7|0D8|0D9|0DA|0DB|0DC|0DD|0DE|0DF|0DG|0DH|0DL|0DM|0DN|0DO|0DQ|0DR|0DS|0DT|0DU|0DV|0DV|0DW|0DX|0DX|0DY|0DY|0DZ|0Db|0Dd|0De|0Df|0Dg|0Dh|0Di|0Dj|0Dk|0Dl|0Dm|0Dp|0Dq|0Dr|0Ds|0Dt|0Du|0Dv|0Dy|0Dz|0E0|0E1|0E2|0E3|0E4|0E5|0E6|0E7|0E8|0E9|0EA|0EB|0ED|0EE|0EF|0EG|0EH|0EI|0EJ|0EM|0EO|0EP|0EQ|0ER|0EV|0EW|0EX|0EZ|0Eb|0Ee|0Ef|0Eg|0Eh|0El|0Em|0En|0Ep|0Eq|0Er|0Es|0Et|0Eu|0Ev|0Ex|0Ey|0Ez|0F0|0F1|0F2|0F3|0F5|0F7|0F8|0F9|0FA|0FB|0FG|0FH|0FI|0FJ|0FK|0FM|0FO|0FP|0FQ|0FR|0FT|0FX|0Fa|0Fb|0Fc|0Fd|0Fe|0Ff|0Fg|0Fh|0Fi|0Fj|0Fl|0Fm|0Fn|0Fo|0Fp|0Fq|0Fr|0Fs|0Ft|0Fu|0Fv|0Fy|0Fz|0G1|0G2|0G3|0G4|0G5|0G6|0G7|0G8|0G9|0GC|0GD|0GE|0GH|0GI|0GJ|0GK|0GL|0GM|0GN|0GO|0GP|0GQ|0GR|0GS|0GT|0GU|0GV|0GW|0GY|0Ga|0Gc|0Gf|0Gg|0Gi|0Gj|0Gm|0Gn|0Go|0Gp|0Gq|0Gq|0Gr|0Gt|0Gu|0Gv|0Gw|0Gx|0Gy|0Gz|0H0|0H1|0H2|0H4|0H6|0H7|0H9|0HC|0HD|0HE|0HF|0HG|0HI|0HJ|0HK|0HN|0HO|0HP|0HQ|0HR|0HS|0HT|0HU|0HV|0HW|0HX|0HY|0HZ|0Ha|0Hb|0Hc|0Hd|0He|0Hf|0Hg|0Hh|0Hi|0Hj|0Hk|0Hl|0Hn|0Ho|0Hp|0Hq|0Hr|0Hs|0Ht|0Hu|0Hv|0Hw|0Hx|0Hy|0Hz|0I0|0I1|0I2|0I3|0I4|0I5|0I6|0I7|0I8|0I9|0IA|0IB|0IC|0ID|0IF|0IG|0II|0IO|0IS|0IT|0IU|0IV|0IW|0IX|0IY|0IZ|0Ia|0Ib|0Ic|0Id|0Ie|0If|0Ig|0Ih|0Ii|0Ij|0Ik|0Il|0In|0Io|0Iq|0Ir|0It|0Iu|0Iv|0Iw|0Iy|0Iz|0J0|0J1|0J2|0J3|0J4|0J5|0J6|0J7|0J8|0J9|0JB|0JD|0JE|0JF|0JJ|0JK|0JL|0JM|0JO|0JP|0JR|0JS|0JT|0JU|0JV|0JW|0JX|0JY|0JZ|0Ja|0Jb|0Jc|0Jd|0Je|0Jf|0Jg|0Ji|0Jj|0Jk|0Jl|0Jm|0Jn|0Jo|0Jp|0Jq|0Jr|0Js|0Jt|0Ju|0Jv|0Jx|0Jy|0Jz|0K0|0K2|0K3|0K4|0K6|0K7|0K9|0KA|0KB|0KD|0KG|0KK|0KM|0KO|0KP|0KR|0KT|0KU|0KV|0KW|0KX|0KY|0KZ|0Ka|0Kb|0Kc|0Kd|0Ke|0Kf|0Kg|0Kh|0Ki|0Km|0Kn|0Ko|0Kp|0Kq|0Kr|0Ks|0Kt|0Ku|0Kv|0Ky|0Kz|0L0|0L1|0L2|0L3|0L4|0L5|0LC|0LD|0LE|0LG|0LH|0LI|0LJ|0LM|0LN|0LO|0LP|0LQ|0LR|0LT|0LV|0LY|0LZ|0La|0Lb|0Lc|0Ld|0Le|0Lf|0Lg|0Lh|0Li|0Lj|0Ll|0Lm|0Ln|0Lo|0Lq|0Ls|0Lu|0Lw|0Lx|0Ly|0Lz|0M0|0M1|0M2|0M3|0M4|0M5|0M6|0M9|0MA|0MD|0ME|0MF|0MH|0MI|0MJ|0MK|0ML|0MM|0MN|0MO|0MP|0MQ|0MR|0MT|0MU|0MV|0MW|0MY|0MZ|0Ma|0Mb|0Me|0Mf|0Mg|0Mh|0Mi|0Mj|0Mk|0Mm|0Mn|0Mo|0Mp|0Mq|0Ms|0Mt|0Mu|0Mw|0My|0Mz|0N0|0N1|0N2|0N3|0N4|0N5|0N9|0NB|0NC|0ND|0NE|0NF|0NI|0NK|0NL|0NM|0NN|0NQ|0NR|0NU|0NV|0NW|0NX|0NZ|0Na|0Nb|0Nc|0Nd|0Ne|0Nf|0Ng|0Nh|0Ni|0Nj|0Nk|0Nl|0Nm|0Nn|0No|0Np|0Nq|0Nr|0Ns|0Nt|0Nu|0Nv|0Nw|0Nx|0Ny|0O0|0O1|0O4|0O5|0O6|0O7|0O8|0OB|0OC|0OD|0OE|0OF|0OG|0OH|0OI|0OK|0OL|0OO|0OP|0OV|0OZ|0Oa|0Ob|0Oe|0Of|0Oi|0Ol|0Om|0Oq|0Or|0Ow|0Ox|0P0|0P1|0P2|0P5|0P9|0PA|0PB|0PC|0PD|0PF|0PG|0PH|0PK|0PL|0PM|0PO|0PP|0PQ|0PS|0PX|0PY|0PZ|0Pa|0Pk|0Pl|0Pm|0Pp|0Pp|0Pq|0Pr|0Ps|0Pt|0Pu|0Pv|0Px|0Py|0Pz|0Q0|0Q1|0Q3|0Q5|0Q7|0QD|0QH|0QI|0QJ|0QK|0QL|0QM|0QO|0QP|0QR|0QT|0QU|0QV|0QY|0QZ|0Qb|0Qc|0Qd|0Qf|0Qg|0Qh|0Qi|0Qj|0Qk|0Qm|0Qn|0Qo|0Qp|0Qq|0Qt|0Qu|0Qw|0Qx|0Qy|0Qz|0R0|0R1|0R2|0R8|0RA|0RB|0RC|0RD|0RE|0RH|0RI|0RJ|0RL|0RM|0RT|0RX|0RY|0RZ|0Rb|0Rd|0Rf|0Rg|0Rh|0Ri|0Rl|0Rm|0Rn|0Rp|0Rr|0Rs|0Rs|0Rt|0Ru|0Rv|0Rw|0Rx|0S1|0S2|0S5|0S6|0SE|0SK|0SL|0SM|0SO|0SP|0SR|0ST|0SU|0SV|0SX|0Sa|0Sb|0Se|0Sf|0Sg|0Si|0Sj|0Sk|0Sl|0Sn|0So|0Sq|0Sr|0Ss|0Su|0Sy|0Sz|0T0|0T1|0T2|0T5|0T6|0T7|0T9|0TA|0TB|0TC|0TD|0TG|0TH|0TI|0TJ|0TK|0TL|0TM|0TN|0TO|0TR|0TS|0TT|0TU|0TW|0TY|0TZ|0Tc|0Td|0Te|0Tg|0Ti|0Tj|0Tp|0Ts|0Tt|0Tv|0Tw|0Tz|0U5|0U6|0UG|0UJ|0UM|0UN|0UO|0UR|0US|0UT|0UV|0UW|0UX|0UZ|0Ua|0Ub|0Uc|0Ud|0Ue|0Uh|0Ui|0Uj|0Uk|0Ul|0Um|0Un|0Uq|0Us|0Uu|0Uv|0Uw|0Ux|0Uy|0Uz|0V2|0V8|0V9|0VA|0VB|0VC|0VD|0VF|0VG|0VI|0VK|0VL|0VM|0VP|0VQ|0VR|0VS|0VX|0VY|0VZ|0Vi|0Vk|0Vl|0Vo|0Vp|0Vs|0Vv|0Vy|0Vz|0W0|0W1|0W2|0W3|0W4|0W5|0W7|0W8|0WA|0WB|0WC|0WD|0WE|0WF|0WG|0WH|0WI|0WJ|0WK|0WL|0WM|0WO|0WQ|0WR|0Wa|0Wb|0Wg|0Wh|0Wi|0Wv|0Ww|0Wx|0Wy|0Wz|0X0|0X1|0X2|0X5|0X7|0X8|0XA|0XB|0XC|0XC|0XD|0XE|0XF|0XG|0XH|0XI|0XK|0XN|0XR|0XS|0XT|0XU|0XY|0Xc|0Xe|0Xj|0Xk|0Xl|0Xs|0Xt|0Xv|0Xw|0Xx|0Xy|0Y7|0Y8|0YD|0YI|0YL|0YM|0YN|0YO|0YS|0YT|0YW|0YY|0YZ|0Ya|0Ym|0Yq|0Yr|0Ys|0Yu|0Yv|0Yw|0Yx|0Yy|0Z2|0Z5|0Z7|0ZA|0ZB|0ZD|0ZE|0ZQ|0ZT|0ZU|0ZW|0ZX|0ZY|0ZZ|0Zb|0Zd|0Ze|0Zf|0Zg|0Zh|0Zj|0Zk|0Zm|0Zn|0Zo|0Zq|0Zr|0Zs|0Zt|0Zu|0Zx|0Zy|0a0|0a2|0a5|0aB|0aC|0aD|0aJ|0aQ|0aS|0aa|0ab|0ad|0ae|0af|0al|0am|0ao|0ap|0aq|0b0|0b1|0b3|0b8|0bF|0bJ|0bK|0bN|0bO|0bP|0bQ|0bR|0bS|0bT|0bW|0bX|0bY|0bZ|0bc|0bd|0be|0bf|0bg|0bh|0bi|0bk|0bm|0bn|0bo|0br|0bs|0bt|0bu|0bv|0by|0bz|0c0|0c1|0c6|0cC|0cE|0cF|0cH|0cI|0cJ|0cK|0cM|0cN|0cP|0cQ|0cS|0cT|0cU|0cV|0cW|0cY|0ca|0cb|0cd|0ce|0cf|0cg|0ch|0ci|0cj|0ck|0cl|0cm|0cn|0cs|0cu|0cv|0cw|0cx|0d0|0d4|0d8|0dN|0dO|0dR|0dU|0dY|0dd|0dh|0dk|0dn|0do|0dq|0dr|0du|0dz|0e0|0e1|0e2|0e4|0e5|0e7|0e8|0eA|0eB|0eC|0eF|0eH|0eK|0eN|0eO|0eP|0eQ|0eS|0eT|0eU|0eX|0eb|0el|0en|0eo|0ep|0eq|0er|0et|0ex|0f6|0fE|0fL|0fP|0fR|0fi|0fj|0fr|0fu|0fw|0fy|0g0|0g2|0g3|0g4|0g8|0gP|0gR|0gS|0gU|0ga|0gi|0gl|0gp|0gv|0hJ|0hK|0hY|0hc|0hd|0hn|0hr|0ht|0hx|0hy|0iA|0iJ|0iK|0iR|0in|0j5|0j6|0j7|0j8|0jd|0jk|0jl|0jp|0jv|0jx|0k8|0ka|0kb|0kt|0mV|0mt|0n3|0nU|0ns|0ob|0pr|0ps|0rB|0ri|0rp|0rs|0sa|0sg|0sn|0sp|0sr|0t0|0tG|0tR|0tS|0ta|0te|0tg|0tn|0tr|0ts|0tu|0up|0ur|0v8|0wt|0xt|0yp|0zF|0zf|100|101|102|10y|10z|110|111|112|113|11a|128|129|130|131|149|172|19i|1AB|1AR|1CA|1CB|1CC|1CF|1CL|1CP|1CS|1DS|1DW|1ED|1EF|1EH|1EM|1EP|1ES|1ET|1EV|1Ep|1FS|1GS|1HA|1HB|1HC|1JS|1L7|1L8|1LB|1LT|1MA|1MC|1MP|1Mc|1NR|1OO|1OZ|1PI|1PL|1QQ|1QR|1RL|1RS|1RU|1S1|1SA|1SR|1ST|1Sl|1U7|1U9|1V4|1WK|1WL|1XO|1XP|1Xl|1Xm|1Xo|1Xp|1Xt|1Xx|1YZ|1ZE|1bm|1br|1cN|1cb|1ci|1cl|1cm|1cr|1dc|1de|1do|1dp|1dr|1gh|1gp|1mr|1o1|1pm|1ps|1rX|1rY|1rZ|1rp|1rr|1s2|1sa|1te|1ts|1vc|1w1|1w2|1w5|1w6|200|201|202|203|204|205|208|20A|20X|20Y|20Z|21Z|23N|26Z|2AS|2BM|2CE|2Ca|2Cx|2ED|2EH|2EP|2ET|2FE|2FF|2LA|2Pd|2Pe|2SB|2SR|2ZC|2ai|2hf|2kA|2mn|2mp|2oN|2pc|2wz|300|301|302|303|307|308|309|30A|30C|30D|30F|30L|30Q|30R|30S|30T|30V|30W|30X|30a|30c|30d|30e|30f|30g|30m|30p|30r|30t|30v|310|31A|31C|31S|31V|31c|31d|31i|31o|31v|31w|31x|31y|31z|32A|34L|365|39d|3AM|3CL|3Ca|3DP|3DS|3Db|3Df|3Dp|3Er|3FC|3FL|3HP|3J5|3JK|3M0|3M1|3M2|3M3|3M4|3M5|3M6|3MA|3MB|3MC|3MD|3ME|3MF|3MG|3MH|3MI|3MJ|3MK|3MM|3MN|3MO|3MP|3MQ|3MR|3MS|3MT|3MU|3MV|3MW|3Mi|3Ml|3Ms|3Mt|3N1|3NA|3NB|3NC|3NO|3NS|3NT|3NU|3NV|3NW|3NX|3NY|3NZ|3PP|3PS|3PX|3Pb|3Ph|3Pp|3Ri|3SP|3SR|3SS|3U2|3Ys|3ad|3cd|3dd|3ec|3la|3mK|3mi|3pc|3pd|3pf|3qb|3qc|3qd|3qe|3qf|3qg|3qh|3qi|3tt|3uC|3v1|3vd|3zl|400|401|402|403|404|405|406|407|408|410|412|413|42C|48D|4A0|4Dr|4F0|4F1|4F2|4F3|4F4|4F5|4M5|4M6|4NA|4NB|4NC|4ND|4NW|4V3|4Wz|4XF|4YL|4Zu|4ci|4cl|4co|4dt|4fe|4fp|4ft|4hy|4ie|4nK|4nL|4nM|4pb|4pv|4sr|4st|4sv|4v2|4ve|4ws|4wt|4xo|4xs|500|501|50g|50r|550|551|552|553|554|555|556|557|558|559|560|561|562|563|570|571|572|573|574|577|5CS|5H0|5H1|5H2|5LH|5ML|5OU|5Pa|5QL|5Sp|5TV|5Uj|600|601|602|604|605|606|607|608|625|62C|6AA|6AB|6AC|6AD|6At|6Au|6BX|6EB|6S9|6SS|6TS|6ZC|6e8|6f3|6g5|6gt|6mX|6pS|700|701|707|708|709|70a|70b|70c|70d|710|711|712|713|714|715|716|729|737|750|751|752|753|754|766|777|7Ce|7EL|7Eh|7Eq|7Er|7FG|7MM|7dR|7dl|7fc|7iv|7ov|7pV|7tf|7tg|7ud|7ue|800|801|802|803|804|805|806|807|80D|810|811|817|820|822|823|824|825|828|829|82B|873|874|876|877|886|888|889|8BM|8D3|8GR|8Kk|8Z7|8dy|8gZ|8gt|8lW|8wk|8yy|906|907|910|911|912|918|99Q|9BV|9D9|9DV|9EW|9EZ|9NV|9Pt|9Pu|9Px|9Py|9UX|9V6|9Vl|9XN|9XP|9aM|9bq|9gd|9jr|9qb|9qc|9qd|9s4|9s9|9ss|9tv|9xb|9xc|9yZ|9yx|9zO|9zx|9zz|a[a-zA-Z0-9]|e[a-zA-Z0-9]|h[a-zA-Z0-9]|kA#|ka#|ka0|m[a-zA-Z0-9]|z[a-zA-Z0-9]|X00|00N";
export const SALESFORCE_ID_PATTERN = new RegExp(
	`(?:^|\\/|=)((?:${SALESFORCE_ID_PREFIX})[0-9a-zA-Z]{12,15})(?=$|\\/|\\?|&)`,
	"i",
);
export const SALESFORCE_URL_PATTERN =
	/^[a-zA-Z0-9\-]+(--[a-zA-Z0-9]+\.sandbox)?(\.develop)?$/g;
export const FRAME_PATTERNS = [
	`${HTTPS}*${MY_SALESFORCE_SETUP_COM}/*`,
	`${HTTPS}*${LIGHTNING_FORCE_COM}/*`,
	`${HTTPS}*${MY_SALESFORCE_COM}/*`,
];
// add `/setup/lightning/` to the framePatterns
export const CONTEXT_MENU_PATTERNS = FRAME_PATTERNS.map((item) =>
	`${item.substring(0, item.length - 2)}${SETUP_LIGHTNING}*`
);
export const CONTEXT_MENU_PATTERNS_REGEX = CONTEXT_MENU_PATTERNS.map((item) =>
	item.replaceAll("\*", ".*")
);
export const SALESFORCE_LIGHTNING_PATTERN = new RegExp(
	`^${HTTPS}[a-zA-Z0-9.-]+${LIGHTNING_FORCE_COM.replaceAll("\.", "\\.")}.*$`,
);
export const SETUP_LIGHTNING_PATTERN = new RegExp(`.*${SETUP_LIGHTNING}.*`);
const MY_SALESFORCE_SETUP_COM_OPERATING_PATTERN =
	`*${PROTOCOL_SEPARATOR}*${MY_SALESFORCE_SETUP_COM}${SETUP_LIGHTNING}*`;
const LIGHTNING_FORCE_COM_OPERATING_PATTERN =
	`*${PROTOCOL_SEPARATOR}*${LIGHTNING_FORCE_COM}${SETUP_LIGHTNING}*`;
const MY_SALESFORCE_COM_OPERATING_PATTERN =
	`*${PROTOCOL_SEPARATOR}*${MY_SALESFORCE_COM}/*`;
export const OPERATING_PATTERNS = [
	MY_SALESFORCE_SETUP_COM_OPERATING_PATTERN,
	LIGHTNING_FORCE_COM_OPERATING_PATTERN,
	MY_SALESFORCE_COM_OPERATING_PATTERN,
];
/**
 * Sends a message to the background script with the specified message.
 *
 * @param {Object} message - The message to send.
 * @param {function} callback - The callback to execute after sending the message.
 */
export function sendExtensionMessage(message, callback = null) {
	/**
	 * Invoke the runtime to send the message
	 *
	 * @param {Object} message - The message to send
	 * @param {function} callback - The callback to execute after sending the message
	 */
	function sendMessage(message, callback) {
		return BROWSER.runtime.sendMessage(message, callback);
	}
	if (callback == null) {
		return new Promise((resolve, reject) => {
			sendMessage(
				message,
				(response) => {
					if (BROWSER.runtime.lastError) {
						reject(BROWSER.runtime.lastError);
					} else {
						resolve(response);
					}
				},
			);
		});
	}
	sendMessage(message, callback);
}
export async function getSettings(keys = null) {
	return await sendExtensionMessage({ what: "get-settings", keys });
}
// SETTINGS
export const SETTINGS_KEY = "settings";
export const LINK_NEW_BROWSER = "link_new_browser";
export const SKIP_LINK_DETECTION = "skip_link_detection";
export const USE_LIGHTNING_NAVIGATION = "use_lightning_navigation";
export const POPUP_OPEN_LOGIN = "popup_open_login";
export const POPUP_OPEN_SETUP = "popup_open_setup";
export const POPUP_LOGIN_NEW_TAB = "popup_login_new_tab";
export const POPUP_SETUP_NEW_TAB = "popup_setup_new_tab";
export const NO_RELEASE_NOTES = "no_release_notes";
export const NO_UPDATE_NOTIFICATION = "no_update_notification";
// decoration settings
export const TAB_GENERIC_STYLE = "tab_generic_style";
export const GENERIC_TAB_STYLE_KEY = `${SETTINGS_KEY}-${TAB_GENERIC_STYLE}`;
export const TAB_ORG_STYLE = "tab_org_style";
export const ORG_TAB_STYLE_KEY = `${SETTINGS_KEY}-${TAB_ORG_STYLE}`;
export const TAB_STYLE_BACKGROUND = "background";
export const TAB_STYLE_COLOR = "color";
export const TAB_STYLE_BORDER = "border";
export const TAB_STYLE_SHADOW = "shadow";
export const TAB_STYLE_HOVER = "hover";
export const TAB_STYLE_BOLD = "bold";
export const TAB_STYLE_ITALIC = "italic";
export const TAB_STYLE_UNDERLINE = "underline";
//export const TAB_STYLE_WAVY = "wavy";
export const TAB_STYLE_TOP = "top";
export const SLDS_ACTIVE = "slds-is-active";
const SLDS_ACTIVE_CLASS = `.${SLDS_ACTIVE}`;
export const ORG_TAB_CLASS = "is-org-tab";
const HAS_ORG_TAB = `:has(.${ORG_TAB_CLASS})`;

/**
 * Retrieves saved style settings for the specified key.
 * @async
 * @param {string} [key=GENERIC_TAB_STYLE_KEY] - Key identifying which style settings to fetch.
 * @returns {Promise<Object|null>} The retrieved style settings or null if none exist.
 */
export async function getStyleSettings(key = GENERIC_TAB_STYLE_KEY) {
	return await sendExtensionMessage({ what: "get-style-settings", key });
}

/**
 * Retrieves style settings for both generic and org tabs.
 *
 * - Fetches settings for GENERIC_TAB_STYLE_KEY and ORG_TAB_STYLE_KEY.
 * - Returns null if neither setting exists.
 * - Otherwise returns an object mapping each key to its settings.
 * @async
 * @returns {Promise<Object<string, any[] | null> | null>} Object with style arrays for each key, or null.
 */
export async function getAllStyleSettings() {
	const genericStyles = await getStyleSettings(GENERIC_TAB_STYLE_KEY);
	const orgStyles = await getStyleSettings(ORG_TAB_STYLE_KEY);
	if (genericStyles == null && orgStyles == null) {
		return null;
	}
	const result = {};
	result[GENERIC_TAB_STYLE_KEY] = genericStyles;
	result[ORG_TAB_STYLE_KEY] = orgStyles;
	return result;
}

/**
 * Constructs a CSS selector string based on tab state, type, and optional pseudo-element.
 *
 * @param {boolean} [isInactive=true] - Whether the selector targets inactive tabs.
 * @param {boolean} [isGeneric=true] - Whether the selector targets generic tabs.
 * @param {string} [pseudoElement=""] - Optional pseudo-element or pseudo-class to append.
 * @returns {string} The constructed CSS selector.
 */
export function getCssSelector(
	isInactive = true,
	isGeneric = true,
	pseudoElement = "",
) {
	return `.${EXTENSION_NAME}${
		isInactive ? `:not(${SLDS_ACTIVE_CLASS})` : SLDS_ACTIVE_CLASS
	}${isGeneric ? `:not(${HAS_ORG_TAB})` : HAS_ORG_TAB}${pseudoElement}`;
}

/**
 * Returns a CSS rule string based on the given style ID and optional value.
 *
 * @param {string} styleId - Identifier for the style to generate.
 * @param {string|null} [value=null] - Value to apply in the CSS rule if needed.
 * @returns {string} The corresponding CSS rule or an empty string if invalid.
 */
export function getCssRule(styleId, value = null) {
	switch (styleId) {
		case TAB_STYLE_BACKGROUND:
		case TAB_STYLE_HOVER:
		case TAB_STYLE_TOP:
			return `background-color: ${value} !important;`;
		case TAB_STYLE_COLOR:
			return `color: ${value};`;
		case TAB_STYLE_BORDER:
			return `border: 2px solid ${value};`;
		case TAB_STYLE_SHADOW:
			return `text-shadow: 0px 0px 3px ${value};`;
		case TAB_STYLE_BOLD:
			return "font-weight: bold;";
		case TAB_STYLE_ITALIC:
			return "font-style: italic;";
		case TAB_STYLE_UNDERLINE:
			return "text-decoration: underline;";
		//case TAB_STYLE_WAVY:
		//return "text-decoration: underline wavy;";
		case "user-set":
			return "";
		default:
			console.error(styleId);
			return "";
	}
}
export const USER_LANGUAGE = "picked-language";
export const FOLLOW_SF_LANG = "follow-sf-lang";
export const TAB_ON_LEFT = "tab_position_left";
export function openSettingsPage() {
	if (BROWSER.runtime.openOptionsPage) {
		BROWSER.runtime.openOptionsPage();
	} else {
		open(BROWSER.runtime.getURL("settings/options.html"));
	}
}
// context menus
export const CXM_OPEN_OTHER_ORG = "open-other-org";
export const CXM_UPDATE_ORG = "update-org";
export const CXM_UPDATE_TAB = "update-tab";
export const CXM_MOVE_FIRST = "move-first";
export const CXM_MOVE_LEFT = "move-left";
export const CXM_MOVE_RIGHT = "move-right";
export const CXM_MOVE_LAST = "move-last";
export const CXM_REMOVE_TAB = "remove-tab";
export const CXM_REMOVE_OTHER_TABS = "remove-other-tabs";
export const CXM_REMOVE_LEFT_TABS = "remove-left-tabs";
export const CXM_REMOVE_RIGHT_TABS = "remove-right-tabs";
export const CXM_EMPTY_NO_ORG_TABS = "empty-no-org-tabs";
export const CXM_EMPTY_TABS = "empty-tabs";
export const CXM_IMPORT_TABS = "import-tabs";
export const CXM_EXPORT_TABS = "export-tabs";
export const CXM_PAGE_SAVE_TAB = "page-save-tab";
export const CXM_PAGE_REMOVE_TAB = "page-remove-tab";
// commands (keyboard shortcuts)
export const CMD_SAVE_AS_TAB = "cmd-save-as-tab";
export const CMD_REMOVE_TAB = "cmd-remove-tab";
export const CMD_TOGGLE_ORG = "cmd-toggle-org";
export const CMD_UPDATE_TAB = "cmd-update-tab";
export const CMD_OPEN_SETTINGS = "cmd-open-settings";
export const CMD_OPEN_OTHER_ORG = "cmd-open-other-org";
export const CMD_IMPORT = "cmd-import";
export const CMD_EXPORT_ALL = "cmd-export-all";
export const WHAT_UPDATE_EXTENSION = "update-extension";
