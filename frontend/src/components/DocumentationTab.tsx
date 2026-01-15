export function DocumentationTab() {
  return (
    <div className="space-y-6">
      {/* System Section */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">System</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-600 mb-4">
              This simulator models a solar thermal system consisting of three main components:
              a flat-plate solar collector, a circulation pump, and a well-mixed storage tank.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>
                <strong>Solar Collector</strong>: Absorbs solar radiation and transfers heat to the
                circulating fluid. Characterized by optical efficiency, heat removal factor, and
                loss coefficient.
              </li>
              <li>
                <strong>Circulation Pump</strong>: Moves fluid between the collector and tank.
                Controlled by a hysteresis controller based on temperature differential.
              </li>
              <li>
                <strong>Storage Tank</strong>: A well-mixed thermal storage vessel that accumulates
                heat during the day. Loses heat to the surrounding room environment.
              </li>
            </ul>
          </div>
          <div className="flex justify-center items-start">
            <img
              src="/system.png"
              alt="Solar thermal system diagram showing solar collector, pump, and storage tank"
              className="max-w-full h-auto rounded-lg border border-gray-200"
            />
          </div>
        </div>
      </section>

      {/* Modeling Approach Section */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Modeling Approach</h2>
        <p className="text-gray-600 mb-4">
          The system is modeled using a lumped-parameter approach with the following assumptions:
        </p>
        <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
          <li>The storage tank is perfectly mixed (single temperature state T<sub>tank</sub>)</li>
          <li>Steady-state collector model using the Hottel-Whillier-Bliss equation</li>
          <li>Collector useful heat gain is clamped to Q<sub>u</sub> &ge; 0 (no reverse heat flow)</li>
          <li>Tank heat loss is proportional to (T<sub>tank</sub> - T<sub>room</sub>) with constant UA</li>
          <li>All temperatures are internally computed in Kelvin for consistency</li>
        </ul>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Collector Useful Heat Gain */}
          <div className="bg-orange-50 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-orange-900 mb-3">
              Collector Useful Heat Gain (Hottel-Whillier-Bliss)
            </h3>
            <div className="bg-white rounded p-4 mb-4 text-center">
              <p className="text-lg font-mono text-gray-800">
                Q<sub>u</sub> = A<sub>c</sub> &middot; F<sub>R</sub> &middot; [G &middot; &eta;<sub>0</sub> - U<sub>L</sub> &middot; (T<sub>in</sub> - T<sub>amb</sub>)]
              </p>
            </div>
            <div className="text-sm text-orange-800 space-y-1">
              <p><strong>Q<sub>u</sub></strong> — Useful heat gain delivered to the fluid [W]</p>
              <p><strong>A<sub>c</sub></strong> — Collector area [m&sup2;]</p>
              <p><strong>F<sub>R</sub></strong> — Heat removal factor (efficiency of heat transfer from absorber to fluid) [dimensionless]</p>
              <p><strong>G</strong> — Solar irradiance on collector surface [W/m&sup2;]</p>
              <p><strong>&eta;<sub>0</sub></strong> — Optical efficiency (transmittance-absorptance product) [dimensionless]</p>
              <p><strong>U<sub>L</sub></strong> — Overall heat loss coefficient [W/(m&sup2;&middot;K)]</p>
              <p><strong>T<sub>in</sub></strong> — Fluid inlet temperature (= T<sub>tank</sub>) [K]</p>
              <p><strong>T<sub>amb</sub></strong> — Ambient outdoor temperature [K]</p>
            </div>
            <div className="mt-4 p-3 bg-orange-100 rounded text-sm text-orange-900">
              <strong>Note:</strong> Q<sub>u</sub> is clamped to &ge; 0 to prevent the collector from cooling the tank
              when losses exceed gains.
            </div>
          </div>

          {/* Tank Energy Balance */}
          <div className="bg-blue-50 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              Tank Energy Balance (Governing ODE)
            </h3>
            <div className="bg-white rounded p-4 mb-4 text-center">
              <p className="text-lg font-mono text-gray-800">
                m &middot; c<sub>p</sub> &middot; dT<sub>tank</sub>/dt = Q<sub>u</sub> - UA &middot; (T<sub>tank</sub> - T<sub>room</sub>)
              </p>
            </div>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>m</strong> — Mass of water in the tank [kg]</p>
              <p><strong>c<sub>p</sub></strong> — Specific heat capacity of water [J/(kg&middot;K)]</p>
              <p><strong>T<sub>tank</sub></strong> — Tank water temperature (state variable) [K]</p>
              <p><strong>dT<sub>tank</sub>/dt</strong> — Rate of change of tank temperature [K/s]</p>
              <p><strong>Q<sub>u</sub></strong> — Useful heat from collector (0 when pump is off) [W]</p>
              <p><strong>UA</strong> — Tank heat loss coefficient [W/K]</p>
              <p><strong>T<sub>room</sub></strong> — Indoor room temperature (constant) [K]</p>
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded text-sm text-blue-900">
              <strong>Physical interpretation:</strong> The tank temperature rises when collector heat input
              exceeds losses to the room, and falls when losses dominate.
            </div>
          </div>
        </div>

        {/* Collector Outlet Temperature */}
        <div className="mt-6 bg-gray-50 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Collector Outlet Temperature
          </h3>
          <div className="bg-white rounded p-4 mb-4 text-center">
            <p className="text-lg font-mono text-gray-800">
              T<sub>out</sub> = T<sub>in</sub> + Q<sub>u</sub> / (&#7745; &middot; c<sub>p</sub>)
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>T<sub>out</sub></strong> — Collector outlet (fluid exit) temperature [K]</p>
              <p><strong>T<sub>in</sub></strong> — Collector inlet temperature (= T<sub>tank</sub>) [K]</p>
              <p><strong>Q<sub>u</sub></strong> — Useful heat gain [W]</p>
              <p><strong>&#7745;</strong> — Mass flow rate through collector [kg/s]</p>
              <p><strong>c<sub>p</sub></strong> — Specific heat capacity of fluid [J/(kg&middot;K)]</p>
            </div>
            <div className="text-sm text-gray-600">
              <p className="mb-2">
                This equation determines the temperature lift across the collector. Higher flow rates
                result in smaller temperature lifts for the same heat input.
              </p>
              <p>
                The pump control uses (T<sub>out</sub> - T<sub>tank</sub>) to decide when to turn on/off.
              </p>
            </div>
          </div>
        </div>

        {/* Pump Control */}
        <div className="mt-6 bg-green-50 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-green-900 mb-3">Pump Hysteresis Control</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="bg-white rounded p-4 mb-3">
                <p className="font-mono text-gray-800 text-center">
                  Pump ON when: &Delta;T &gt; &Delta;T<sub>on</sub> AND G &gt; G<sub>min</sub>
                </p>
              </div>
              <div className="bg-white rounded p-4">
                <p className="font-mono text-gray-800 text-center">
                  Pump OFF when: &Delta;T &lt; &Delta;T<sub>off</sub> OR G &lt; G<sub>min</sub>
                </p>
              </div>
            </div>
            <div className="text-sm text-green-800 space-y-1">
              <p><strong>&Delta;T</strong> — Temperature difference (T<sub>out</sub> - T<sub>tank</sub>) [K]</p>
              <p><strong>&Delta;T<sub>on</sub></strong> — Turn-on threshold [K]</p>
              <p><strong>&Delta;T<sub>off</sub></strong> — Turn-off threshold [K]</p>
              <p><strong>G</strong> — Current solar irradiance [W/m&sup2;]</p>
              <p><strong>G<sub>min</sub></strong> — Minimum irradiance for pump operation [W/m&sup2;]</p>
              <p className="mt-2 text-green-700">
                The hysteresis band (&Delta;T<sub>on</sub> &gt; &Delta;T<sub>off</sub>) prevents rapid on/off cycling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Numerical Solvers Section */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Numerical Solvers</h2>
        <p className="text-gray-600 mb-6">
          The governing ODE is solved numerically using fixed time steps. Two integration methods are available:
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Euler Method */}
          <div className="bg-blue-50 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Forward Euler Method</h3>
            <div className="bg-white rounded p-4 mb-4 text-center">
              <p className="text-lg font-mono text-gray-800">
                y<sub>n+1</sub> = y<sub>n</sub> + h &middot; f(t<sub>n</sub>, y<sub>n</sub>)
              </p>
            </div>
            <div className="text-sm text-blue-800 space-y-1 mb-4">
              <p><strong>y<sub>n</sub></strong> — Solution at time step n (here: T<sub>tank</sub>)</p>
              <p><strong>y<sub>n+1</sub></strong> — Solution at next time step</p>
              <p><strong>h</strong> — Time step size &Delta;t [s]</p>
              <p><strong>f(t, y)</strong> — Right-hand side of ODE: dT/dt = f(t, T)</p>
              <p><strong>t<sub>n</sub></strong> — Current time [s]</p>
            </div>
            <div className="bg-blue-100 rounded p-3 text-sm">
              <p className="text-blue-900 mb-2"><strong>Characteristics:</strong></p>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>First-order accurate (global error ~ O(h))</li>
                <li>Local truncation error ~ O(h&sup2;)</li>
                <li>Simple and fast computation</li>
                <li>Larger errors accumulate over time</li>
              </ul>
            </div>
          </div>

          {/* RK4 Method */}
          <div className="bg-green-50 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-green-900 mb-3">Runge-Kutta 4th Order (RK4)</h3>
            <div className="bg-white rounded p-4 mb-4">
              <div className="font-mono text-gray-800 text-sm space-y-1">
                <p>k<sub>1</sub> = f(t<sub>n</sub>, y<sub>n</sub>)</p>
                <p>k<sub>2</sub> = f(t<sub>n</sub> + h/2, y<sub>n</sub> + h&middot;k<sub>1</sub>/2)</p>
                <p>k<sub>3</sub> = f(t<sub>n</sub> + h/2, y<sub>n</sub> + h&middot;k<sub>2</sub>/2)</p>
                <p>k<sub>4</sub> = f(t<sub>n</sub> + h, y<sub>n</sub> + h&middot;k<sub>3</sub>)</p>
                <p className="mt-2 text-center text-base">
                  y<sub>n+1</sub> = y<sub>n</sub> + (h/6)(k<sub>1</sub> + 2k<sub>2</sub> + 2k<sub>3</sub> + k<sub>4</sub>)
                </p>
              </div>
            </div>
            <div className="text-sm text-green-800 space-y-1 mb-4">
              <p><strong>k<sub>1</sub>, k<sub>2</sub>, k<sub>3</sub>, k<sub>4</sub></strong> — Intermediate slope estimates</p>
              <p><strong>h</strong> — Time step size &Delta;t [s]</p>
            </div>
            <div className="bg-green-100 rounded p-3 text-sm">
              <p className="text-green-900 mb-2"><strong>Characteristics:</strong></p>
              <ul className="list-disc list-inside text-green-800 space-y-1">
                <li>Fourth-order accurate (global error ~ O(h&sup4;))</li>
                <li>Local truncation error ~ O(h&sup5;)</li>
                <li>Much higher accuracy for smooth problems</li>
                <li>Default solver (recommended)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">Implementation Note</h4>
          <p className="text-yellow-700 text-sm">
            The pump state (on/off) is evaluated once at the beginning of each time step
            and held constant throughout the step (including RK4 sub-steps k<sub>1</sub> through k<sub>4</sub>).
            This ensures consistent behavior and prevents numerical artifacts from pump state changes
            during intermediate evaluations.
          </p>
        </div>
      </section>

      {/* Limitations Section */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Limitations</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ul className="list-disc list-inside text-gray-600 space-y-3">
            <li>
              <strong>Single-node tank model</strong>: Assumes perfect mixing. Real tanks have
              thermal stratification which improves system performance.
            </li>
            <li>
              <strong>Quasi-steady collector model</strong>: Neglects collector thermal mass
              and transient effects during rapid changes.
            </li>
            <li>
              <strong>Simplified heat transfer</strong>: Uses constant heat removal factor (F<sub>R</sub>)
              which actually varies with flow rate and temperature.
            </li>
            <li>
              <strong>No pipe losses</strong>: Heat loss and thermal capacitance of piping
              between collector and tank are not modeled.
            </li>
          </ul>
          <ul className="list-disc list-inside text-gray-600 space-y-3">
            <li>
              <strong>Synthetic weather only</strong>: Currently uses idealized sinusoidal
              weather patterns rather than real meteorological data.
            </li>
            <li>
              <strong>Fixed time step</strong>: Does not adapt step size based on solution
              dynamics, which could miss rapid transients.
            </li>
            <li>
              <strong>No load profile</strong>: Does not model hot water consumption from the tank.
            </li>
            <li>
              <strong>Single fluid assumption</strong>: Uses water properties; does not support
              glycol mixtures for freeze protection.
            </li>
          </ul>
        </div>
      </section>

      {/* Potential Improvements Section */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Potential Improvements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Physical Model</h4>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
              <li>Multi-node stratified tank model</li>
              <li>Transient collector dynamics</li>
              <li>Pipe heat loss and thermal mass</li>
              <li>Variable flow rate control</li>
              <li>Hot water load profiles</li>
              <li>Auxiliary heating backup</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Numerical Methods</h4>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
              <li>Adaptive step-size control (RK45)</li>
              <li>Implicit methods for stiff problems</li>
              <li>Event detection for pump switching</li>
              <li>Higher-order integrators</li>
              <li>Richardson extrapolation</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Weather Data</h4>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
              <li>Import real TMY/EPW weather files</li>
              <li>Location-based solar position</li>
              <li>Cloud cover and diffuse radiation</li>
              <li>Multi-day simulations</li>
              <li>Seasonal analysis</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">User Interface</h4>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
              <li>Parameter presets for common systems</li>
              <li>Export results to CSV/Excel</li>
              <li>Economic analysis (payback period)</li>
              <li>Comparison of multiple scenarios</li>
              <li>Sensitivity analysis</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
