/*
 * Delay Repay Ledger — reference data.
 * Operator thresholds and bands were checked against published operator pages in 2026.
 * Rules change: update this file when an operator changes its Passenger's Charter.
 */
(function (root) {
  "use strict";

  // Each band is [minutes from, share of fare]. The highest band reached applies.
  const SCHEMES = {
    DR15: {
      label: "Delay Repay 15", from: 15,
      single: [[15, 0.25], [30, 0.5], [60, 1], [120, 1]],
      ret:    [[15, 0.125], [30, 0.25], [60, 0.5], [120, 1]]
    },
    DR30: {
      label: "Delay Repay 30", from: 30,
      single: [[30, 0.5], [60, 1], [120, 1]],
      ret:    [[30, 0.25], [60, 0.5], [120, 1]]
    },
    GC60: {
      label: "From 60 min", from: 60,
      single: [[60, 0.5], [120, 1]],
      ret:    [[60, 0.25], [120, 0.5]]
    },
    SDR30: {
      label: "Refund from 30 min", from: 30,
      single: [[30, 1]],
      ret:    [[30, 0.5]]
    }
  };

  const BAND_EDGES = [15, 30, 60, 120];

  const OPS = [
    { id: "avanti", name: "Avanti West Coast", s: "DR15", url: "https://www.avantiwestcoast.co.uk/help-and-support/delay-repay", note: "Register on the Delay Repay portal if you bought elsewhere." },
    { id: "c2c", name: "c2c", s: "DR15", url: "https://www.c2c-online.co.uk/help_centre/compensation/how-much-will-i-be-repaid/" },
    { id: "chiltern", name: "Chiltern Railways", s: "DR15", url: "https://www.chilternrailways.co.uk/my-train-has-been-delayed-what-are-my-options" },
    { id: "emr", name: "East Midlands Railway", s: "DR15", url: "https://www.eastmidlandsrailway.co.uk/help-manage/manage/make-a-delay-repay-claim" },
    { id: "gatex", name: "Gatwick Express", s: "DR15", url: "https://www.gatwickexpress.com/help-and-support/delay-repay-compensation" },
    { id: "ga", name: "Greater Anglia / Stansted Express", s: "DR15", url: "https://www.greateranglia.co.uk/about-us/our-performance/delay-repay" },
    { id: "gn", name: "Great Northern", s: "DR15", url: "https://www.greatnorthernrail.com/help-and-support/delay-repay-compensation" },
    { id: "gwr", name: "Great Western Railway", s: "DR15", url: "https://www.gwr.com/help-and-support/refunds-and-compensation/delay-repay", note: "eTickets bought on GWR.com get Automatic Delay Repay, so check your email first. Paper forms pay by cheque or voucher only." },
    { id: "northern", name: "Northern", s: "DR15", url: "https://www.northernrailway.co.uk/delay-repay" },
    { id: "se", name: "Southeastern", s: "DR15", url: "https://www.southeasternrailway.co.uk/help/refunds-and-compensation/delay-repay-compensation" },
    { id: "southern", name: "Southern", s: "DR15", url: "https://www.southernrailway.com/help-and-support/delay-repay-compensation" },
    { id: "swr", name: "South Western Railway", s: "DR15", url: "https://www.southwesternrailway.com/contact-and-help/delay-repay", note: "Forwards your claim if another operator caused the delay. Each ticket in a booking is valued separately." },
    { id: "tl", name: "Thameslink", s: "DR15", url: "https://www.thameslinkrailway.com/delayrepay" },
    { id: "tpe", name: "TransPennine Express", s: "DR15", url: "https://www.tpexpress.co.uk/help/delay-repay-compensation", note: "Phone 0345 600 1671. Some Seatfrog claims have been refused through the online form; send the upgrade confirmation to customer relations if so." },
    { id: "tfw", name: "Transport for Wales", s: "DR15", url: "https://tfw.wales/help-and-contact/rail/claim-compensation" },
    { id: "wmr", name: "West Midlands Railway / LNR", s: "DR15", url: "https://www.westmidlandsrailway.co.uk/about-us/delay-repay" },
    { id: "lner", name: "LNER", s: "DR30", url: "https://www.lner.co.uk/support/delay-repay/" },
    { id: "xc", name: "CrossCountry", s: "DR30", url: "https://www.crosscountrytrains.co.uk/customer-service/contact-us/delay-repay" },
    { id: "hull", name: "Hull Trains", s: "DR30", url: "https://www.hulltrains.co.uk/support-and-contact/refunds-and-compensation" },
    { id: "lumo", name: "Lumo", s: "DR30", url: "https://www.lumo.co.uk/help/delay-repay" },
    { id: "scotrail", name: "ScotRail", s: "DR30", url: "https://www.scotrail.co.uk/plan-your-journey/our-delay-repay-guarantee" },
    { id: "sleeper", name: "Caledonian Sleeper", s: "DR30", url: "https://www.sleeper.scot/help-support/after-your-trip/" },
    { id: "gc", name: "Grand Central", s: "GC60", url: "https://www.grandcentralrail.com/help/refunds-and-compensation", note: "Own compensation policy starting at 60 minutes. Check the amounts before claiming." },
    { id: "merseyrail", name: "Merseyrail", s: "SDR30", url: "https://www.merseyrail.org/help-support/frequently-asked-questions/", note: "Uses its own 30-minute compensation rules, so treat this estimate as rough." },
    { id: "tfl", name: "Elizabeth line / London Overground", s: "SDR30", url: "https://tfl.gov.uk/cdn/static/cms/documents/tfl-conditions-of-carriage.pdf", note: "TfL service delay refunds from 30 minutes, usually the single pay-as-you-go fare. Claim through your TfL account." },
    { id: "other", name: "Other operator", s: "DR15", url: "https://www.nationalrail.co.uk/help-and-assistance/compensation-and-refunds/", note: "Estimated with standard Delay Repay 15 rules. Find the operator's own page through National Rail." }
  ];

  // kind: single | return | season (div = journeys the price is split across) | manual
  const TICKETS = [
    { id: "advs", name: "Advance Single", kind: "single" },
    { id: "anys", name: "Anytime Single", kind: "single" },
    { id: "offs", name: "Off-Peak / Super Off-Peak Single", kind: "single" },
    { id: "anyr", name: "Anytime Return", kind: "return" },
    { id: "offr", name: "Off-Peak / Super Off-Peak Return", kind: "return" },
    { id: "sw", name: "Weekly Season", kind: "season", div: 10 },
    { id: "sm", name: "Monthly Season", kind: "season", div: 40 },
    { id: "sq", name: "Quarterly Season", kind: "season", div: 120 },
    { id: "sa", name: "Annual Season", kind: "season", div: 464 },
    { id: "flexi", name: "Flexi Season (8 days in 28)", kind: "season", div: 16 },
    { id: "payg", name: "Contactless / pay as you go", kind: "single" },
    { id: "rover", name: "Rover / Ranger / other", kind: "manual" }
  ];

  const STATIONS = [["Aberdeen","ABD"],["Ashford International","AFK"],["Bath Spa","BTH"],["Basingstoke","BSK"],["Birmingham International","BHI"],["Birmingham New Street","BHM"],["Bournemouth","BMH"],["Bradford Interchange","BDI"],["Brighton","BTN"],["Bristol Parkway","BPW"],["Bristol Temple Meads","BRI"],["Cambridge","CBG"],["Canterbury West","CBW"],["Cardiff Central","CDF"],["Carlisle","CAR"],["Chelmsford","CHM"],["Cheltenham Spa","CNM"],["Chester","CTR"],["Colchester","COL"],["Coventry","COV"],["Crewe","CRE"],["Darlington","DAR"],["Derby","DBY"],["Doncaster","DON"],["Dundee","DEE"],["Durham","DHM"],["Edinburgh","EDB"],["Exeter St Davids","EXD"],["Gatwick Airport","GTW"],["Glasgow Central","GLC"],["Glasgow Queen Street","GLQ"],["Gloucester","GCR"],["Guildford","GLD"],["Harrogate","HGT"],["Huddersfield","HUD"],["Hull","HUL"],["Inverness","INV"],["Ipswich","IPS"],["Lancaster","LAN"],["Leeds","LDS"],["Leicester","LEI"],["Liverpool Lime Street","LIV"],["London Bridge","LBG"],["London Cannon Street","CST"],["London Charing Cross","CHX"],["London Euston","EUS"],["London Fenchurch Street","FST"],["London King's Cross","KGX"],["London Liverpool Street","LST"],["London Marylebone","MYB"],["London Paddington","PAD"],["London St Pancras International","STP"],["London Victoria","VIC"],["London Waterloo","WAT"],["Luton Airport Parkway","LTN"],["Manchester Airport","MIA"],["Manchester Piccadilly","MAN"],["Manchester Victoria","MCV"],["Milton Keynes Central","MKC"],["Newcastle","NCL"],["Norwich","NRW"],["Nottingham","NOT"],["Oxford","OXF"],["Penzance","PNZ"],["Peterborough","PBO"],["Plymouth","PLY"],["Portsmouth Harbour","PMH"],["Preston","PRE"],["Reading","RDG"],["Sheffield","SHF"],["Southampton Central","SOU"],["Southend Central","SOC"],["Stansted Airport","SSD"],["Stevenage","SVG"],["Stirling","STG"],["Stoke-on-Trent","SOT"],["Swansea","SWA"],["Wakefield Westgate","WKF"],["Watford Junction","WFJ"],["Winchester","WIN"],["Woking","WOK"],["Wolverhampton","WVH"],["York","YRK"]];

  const DATA = {
    SCHEMES, BAND_EDGES, OPS, TICKETS, STATIONS,
    OPMAP: Object.fromEntries(OPS.map(o => [o.id, o])),
    TMAP: Object.fromEntries(TICKETS.map(t => [t.id, t])),
    CRS: Object.fromEntries(STATIONS.map(([n, c]) => [n.toLowerCase(), c])),
    CLAIM_WINDOW_DAYS: 28,
    SEATFROG_HELP: "https://help.seatfrog.com/hc/en-gb/articles/8782504918927-What-happens-if-my-upgraded-Train-is-delayed-or-cancelled"
  };

  if (typeof module !== "undefined" && module.exports) module.exports = DATA;
  else root.DRL_DATA = DATA;
})(typeof self !== "undefined" ? self : this);
