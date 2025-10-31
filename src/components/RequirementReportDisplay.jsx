'use client';

import React from 'react';

export default function RequirementReportDisplay({ reportData, type }) {
  if (!reportData) return null;

  const title = type === 'driver' ? 'DRIVERS' : 'CONDUCTORS';

  return (
    <div className="requirement-report-display">
      <div className="requirement-report-header">
        <h3>Physical Requirement of {title} From :- {new Date(reportData.effectiveDate).toLocaleDateString('en-GB')}</h3>
      </div>

      <div className="requirement-table-wrapper">
        <table className="requirement-table">
          <thead>
            <tr>
              <th rowSpan="2">Depot</th>
              <th rowSpan="2">Mon - Sat</th>
              <th rowSpan="2">Sun</th>
              <th rowSpan="2">
                <div className="header-two-line">
                  <div>Avg</div>
                  <div>Duty</div>
                </div>
              </th>
              <th rowSpan="2">
                <div className="header-two-line">
                  <div>Non PF.</div>
                  <div>Duty</div>
                </div>
              </th>
              <th rowSpan="2">Total</th>
              <th colSpan="4">Leave Reserve</th>
              <th rowSpan="2">Total</th>
              <th rowSpan="2">Other</th>
              <th rowSpan="2">
                <div className="header-two-line">
                  <div>Grand</div>
                  <div>Total</div>
                </div>
              </th>
            </tr>
            <tr>
              <th>
                <div className="header-two-line">
                  <div>W/Off</div>
                  <div>20%</div>
                </div>
              </th>
              <th>
                <div className="header-two-line">
                  <div>PL</div>
                  <div>10%</div>
                </div>
              </th>
              <th>
                <div className="header-two-line">
                  <div>CL</div>
                  <div>4%</div>
                </div>
              </th>
              <th>
                <div className="header-two-line">
                  <div>SL</div>
                  <div>4%</div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {reportData.depots.map((depot, index) => (
              <tr key={index}>
                <td>{depot.name}</td>
                <td>{depot.stats.monSat}</td>
                <td>{depot.stats.sun}</td>
                <td>{depot.stats.avgDuty}</td>
                <td>{depot.stats.nonPlatform}</td>
                <td>{depot.stats.total}</td>
                <td>{depot.stats.wOff}</td>
                <td>{depot.stats.pl}</td>
                <td>{depot.stats.cl}</td>
                <td>{depot.stats.sl}</td>
                <td>{depot.stats.totalLeaves}</td>
                <td>{depot.stats.others}</td>
                <td>{depot.stats.grandTotal}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td><strong>Total :-</strong></td>
              <td><strong>{reportData.totals.monSat}</strong></td>
              <td><strong>{reportData.totals.sun}</strong></td>
              <td><strong>{reportData.totals.avgDuty}</strong></td>
              <td><strong>{reportData.totals.nonPlatform}</strong></td>
              <td><strong>{reportData.totals.total}</strong></td>
              <td><strong>{reportData.totals.wOff}</strong></td>
              <td><strong>{reportData.totals.pl}</strong></td>
              <td><strong>{reportData.totals.cl}</strong></td>
              <td><strong>{reportData.totals.sl}</strong></td>
              <td><strong>{reportData.totals.totalLeaves}</strong></td>
              <td><strong>{reportData.totals.others}</strong></td>
              <td><strong>{reportData.totals.grandTotal}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
