export class SI {

    static Q = 1e+30; // quetta
    static R = 1e+27; // ronna
    static Y = 1e+24; // yotta
    static Z = 1e+21; // zetta
    static E = 1e+18; // exa
    static P = 1e+15; // peta
    static T = 1e+12; // tera
    static G = 1e+9;  // giga
    static M = 1e+6;  // mega
    static k = 1e+3;  // kilo
    static h = 1e+2;  // hecto
    static da= 1e+1;  // deca

    static d = 1e-1;  // deci
    static c = 1e-2;  // centi
    static m = 1e-3;  // milli
    static u = 1e-6;  // micro
    static n = 1e-9;  // nano
    static p = 1e-12; // pico
    static f = 1e-15; // femto
    static a = 1e-18; // atto
    static z = 1e-21; // zepto
    static y = 1e-24; // yocto
    static r = 1e-27; // ronto
    static q = 1e-30; // quecto

    static m_per_au = 256;
    static get au_per_m() { return 1 / SI.m_per_au; }

    static m_to_km(m)    { return m / SI.k; }
    static m2_to_km2(m2) { return m2 / (SI.k * SI.k); }
    static m3_to_km3(m3) { return m3 / (SI.k * SI.k * SI.k); }

    static km_to_m(km)    { return km  * SI.k; }
    static km2_to_m2(km2) { return km2 * SI.k * SI.k; }
    static km3_to_m3(km3) { return km3 * SI.k * SI.k * SI.k; }

    static m_to_au(m)    { return m * SI.au_per_m; }
    static m2_to_au2(m2) { return SI.m_to_au(m2) * SI.au_per_m; }
    static m3_to_au3(m3) { return SI.m2_to_au2(m3) * SI.au_per_m; }

    static au_to_m(au)    { return au * SI.m_per_au; }
    static au2_to_m2(au2) { return SI.au_to_m(au2) * SI.m_per_au; }
    static au3_to_m3(au3) { return SI.au2_to_m2(au3) * SI.m_per_au; }

    static au_to_km(au)    { return SI.m_to_km(SI.au_to_m(au)); }
    static au2_to_km2(au2) { return SI.m2_to_km2(SI.au2_to_m2(au2)); }
    static au3_to_km3(au3) { return SI.m3_to_km3(SI.au3_to_m3(au3)); }

    static Ref = {
        length_m: {
            light_ns: 0.2998,
            human_height: 1.7,
            my_height: 1.82,
            short_block: 80,
            long_block: 200,
            my_lunch_walk: 760,
            my_store_walk: 1260,
            my_drive_home: 10900,
            light_ms: 2.998e5,
            moon_radius: 1.7374e6,
            us_i5: 2.22297e6,
            us_i95: 3.09606e6,
            us_i10: 3.95953e6,
            mars_radius: 3.39e6,
            earth_radius: 6.371009e6,
            jupiter_radius: 6.995e7,
            lightsecond: 2.998e8,
            earth_to_moon: 3.85e8,
            sun_radius: 6.957e8,
            sun_to_earth: 1.496e11,
            solar_system_radius: 1.1e13,
            lightyear: 9.461e15,
            galaxy_radius: 4.7e20,
        },

        area_m2: {
            football_field: 5.351e3,
            pan_pacific_park: 1.6165762e5,
            manhattan: 5.868e7,
            los_angeles: 1.2139e9,
            rhode_island: 2.703e9,
            wales: 2.0798e10,
            ireland: 6.888e10,
            lake_victoria: 6.88e10,
            great_britain: 2.09331e11,
            germany: 3.57e11,
            california: 4.035e11,
            texas: 6.957e11,
            alaska: 1.723e12,
            moon: 3.8e13,
            mars: 1.4e14,
            earth: 5.1007e14,
        },

        speed_mps: {
            human_walking: 1.13,
            human_fast_walking: 1.695,
            human_running: 4.52,
            unladen_swallow: 11,
            human_sprinting: 12.35,
            highway: 26.8, // 60 mph
            airliner: 250,
            mach1: 340,
            earth_rotation: 465,
            concorde: 604,
            moon_orbit: 1020,
            earth_escape: 11180,
            earth_orbit: 29800,
            solar_orbit: 200000,
            solar_wind: 450000,
            solar_escape: 617540,
            light: 2.998e8,
        },

        time_s: {
            minute: 60,
            hour: 3600,
            day: 86400,
            week: 604800,
            month: 2.628e6,
            year: 3.154e7,
        },
    };

};