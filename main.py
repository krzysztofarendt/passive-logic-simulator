from __future__ import annotations

from dataclasses import dataclass
from math import cos, pi


@dataclass(frozen=True)
class CollectorParams:
    area_m2: float
    heat_removal_factor: float  # F_R [-]
    optical_efficiency: float  # eta0 [-]
    loss_coefficient_w_m2k: float  # U_L [W/(m^2*K)]


@dataclass(frozen=True)
class TankParams:
    mass_kg: float
    cp_j_kgk: float
    ua_w_k: float  # UAtank [W/K]


@dataclass(frozen=True)
class PumpParams:
    mass_flow_kg_s: float  # m_dot [kg/s] when on


@dataclass(frozen=True)
class ControlParams:
    enabled: bool = True
    delta_t_on_k: float = 2.0
    delta_t_off_k: float = 1.0
    min_irradiance_w_m2: float = 25.0


@dataclass(frozen=True)
class SimulationParams:
    dt_s: float
    duration_s: float


def clamp_min(value: float, minimum: float) -> float:
    return value if value >= minimum else minimum


def irradiance_clear_day_w_m2(t_s: float, *, sunrise_s: float, sunset_s: float, peak_w_m2: float) -> float:
    if t_s < sunrise_s or t_s > sunset_s:
        return 0.0
    x = (t_s - sunrise_s) / (sunset_s - sunrise_s)  # 0..1
    # Half-sine from sunrise to sunset.
    return peak_w_m2 * (1.0 - cos(pi * x)) / 2.0


def ambient_sinusoid_k(t_s: float, *, mean_k: float, amplitude_k: float, period_s: float) -> float:
    return mean_k + amplitude_k * cos(2.0 * pi * t_s / period_s)


def collector_useful_heat_w(
    *,
    t_in_k: float,
    t_amb_k: float,
    irradiance_w_m2: float,
    collector: CollectorParams,
) -> float:
    q_u = collector.area_m2 * collector.heat_removal_factor * (
        collector.optical_efficiency * irradiance_w_m2
        - collector.loss_coefficient_w_m2k * (t_in_k - t_amb_k)
    )
    return clamp_min(q_u, 0.0)


def collector_outlet_k(*, t_in_k: float, q_u_w: float, m_dot_kg_s: float, cp_j_kgk: float) -> float:
    # If m_dot is zero, the loop is not circulating; treat outlet as unchanged.
    if m_dot_kg_s <= 0.0:
        return t_in_k
    return t_in_k + q_u_w / (m_dot_kg_s * cp_j_kgk)


def tank_dTdt_k_s(
    *,
    t_tank_k: float,
    t_out_k: float,
    t_amb_k: float,
    m_dot_kg_s: float,
    tank: TankParams,
) -> float:
    mixing_term = (m_dot_kg_s / tank.mass_kg) * (t_out_k - t_tank_k)
    loss_term = (tank.ua_w_k / (tank.mass_kg * tank.cp_j_kgk)) * (t_tank_k - t_amb_k)
    return mixing_term - loss_term


def rk4_step(
    t_s: float,
    y: float,
    dt_s: float,
    f,
) -> float:
    k1 = f(t_s, y)
    k2 = f(t_s + dt_s / 2.0, y + dt_s * k1 / 2.0)
    k3 = f(t_s + dt_s / 2.0, y + dt_s * k2 / 2.0)
    k4 = f(t_s + dt_s, y + dt_s * k3)
    return y + (dt_s / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)


def update_pump_state(
    *,
    pump_on: bool,
    t_tank_k: float,
    t_amb_k: float,
    irradiance_w_m2: float,
    collector: CollectorParams,
    pump: PumpParams,
    tank: TankParams,
    control: ControlParams,
) -> bool:
    if not control.enabled:
        return True

    if irradiance_w_m2 < control.min_irradiance_w_m2:
        return False

    q_u_nom = collector_useful_heat_w(
        t_in_k=t_tank_k,
        t_amb_k=t_amb_k,
        irradiance_w_m2=irradiance_w_m2,
        collector=collector,
    )
    t_out_nom_k = collector_outlet_k(
        t_in_k=t_tank_k,
        q_u_w=q_u_nom,
        m_dot_kg_s=pump.mass_flow_kg_s,
        cp_j_kgk=tank.cp_j_kgk,
    )

    if pump_on:
        return t_out_nom_k > t_tank_k + control.delta_t_off_k
    return t_out_nom_k > t_tank_k + control.delta_t_on_k


def simulate(
    *,
    t0_s: float,
    t_tank0_k: float,
    collector: CollectorParams,
    tank: TankParams,
    pump: PumpParams,
    control: ControlParams,
    sim: SimulationParams,
) -> tuple[list[float], list[float]]:
    times_s: list[float] = []
    tank_k: list[float] = []

    t_s = t0_s
    t_tank_k = t_tank0_k
    pump_on = False

    n_steps = int(sim.duration_s // sim.dt_s)
    for _ in range(n_steps + 1):
        times_s.append(t_s)
        tank_k.append(t_tank_k)

        irradiance_w_m2 = irradiance_clear_day_w_m2(
            t_s,
            sunrise_s=6 * 3600,
            sunset_s=18 * 3600,
            peak_w_m2=850.0,
        )
        t_amb_k = ambient_sinusoid_k(
            t_s,
            mean_k=293.15,
            amplitude_k=6.0,
            period_s=24 * 3600,
        )

        pump_on = update_pump_state(
            pump_on=pump_on,
            t_tank_k=t_tank_k,
            t_amb_k=t_amb_k,
            irradiance_w_m2=irradiance_w_m2,
            collector=collector,
            pump=pump,
            tank=tank,
            control=control,
        )

        m_dot_kg_s = pump.mass_flow_kg_s if pump_on else 0.0

        def rhs(local_t_s: float, local_t_tank_k: float) -> float:
            local_irradiance_w_m2 = irradiance_clear_day_w_m2(
                local_t_s,
                sunrise_s=6 * 3600,
                sunset_s=18 * 3600,
                peak_w_m2=850.0,
            )
            local_t_amb_k = ambient_sinusoid_k(
                local_t_s,
                mean_k=293.15,
                amplitude_k=6.0,
                period_s=24 * 3600,
            )

            q_u_w = collector_useful_heat_w(
                t_in_k=local_t_tank_k,
                t_amb_k=local_t_amb_k,
                irradiance_w_m2=local_irradiance_w_m2,
                collector=collector,
            )
            t_out_k = collector_outlet_k(
                t_in_k=local_t_tank_k,
                q_u_w=q_u_w,
                m_dot_kg_s=m_dot_kg_s,
                cp_j_kgk=tank.cp_j_kgk,
            )
            return tank_dTdt_k_s(
                t_tank_k=local_t_tank_k,
                t_out_k=t_out_k,
                t_amb_k=local_t_amb_k,
                m_dot_kg_s=m_dot_kg_s,
                tank=tank,
            )

        t_tank_k = rk4_step(t_s, t_tank_k, sim.dt_s, rhs)
        t_s += sim.dt_s

    return times_s, tank_k


def main() -> None:
    collector = CollectorParams(
        area_m2=2.0,
        heat_removal_factor=0.9,
        optical_efficiency=0.75,
        loss_coefficient_w_m2k=5.0,
    )
    tank = TankParams(
        mass_kg=200.0,  # ~200 L of water
        cp_j_kgk=4180.0,
        ua_w_k=3.0,
    )
    pump = PumpParams(mass_flow_kg_s=0.05)
    control = ControlParams(enabled=True, delta_t_on_k=2.0, delta_t_off_k=1.0)
    sim = SimulationParams(dt_s=10.0, duration_s=24 * 3600)

    times_s, tank_k = simulate(
        t0_s=0.0,
        t_tank0_k=293.15,
        collector=collector,
        tank=tank,
        pump=pump,
        control=control,
        sim=sim,
    )

    t_final_k = tank_k[-1]
    print(f"Final tank temperature: {t_final_k:.2f} K")


if __name__ == "__main__":
    main()
