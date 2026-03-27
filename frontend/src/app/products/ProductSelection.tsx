'use client';

import React, { useState } from 'react';
import { withStrapiPublicUrl } from '@/lib/strapi';
import { useRouter } from 'next/navigation';

export default function ProductSelection({ products, buttonConfig }: { products: any[], buttonConfig: any }) {
    const router = useRouter();
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

    const parseBlocks = (richtext: any) => {
        if (!richtext) return null;
        if (typeof richtext === 'string') {
            return <div dangerouslySetInnerHTML={{ __html: richtext }} />;
        }
        return <pre>{JSON.stringify(richtext, null, 2)}</pre>;
    };

    return (
        <section className="value-props-section" style={{ minHeight: '60vh', paddingBottom: '4rem' }}>
            <div className="container animate-fade-in delay-200">
                <div className="card-grid-2">
                    {products && products.length > 0 ? (
                        products.map((product: any, index: number) => {
                            const content = product.attributes || product;
                            const isSelected = selectedProduct === product.id;
                            const logoUrl = content.logo?.data?.attributes?.url || content.logo?.url;

                            return (
                                <div
                                    className={`card ${isSelected ? 'selected' : ''}`}
                                    key={product.id || index}
                                    onClick={() => setSelectedProduct(product.id)}
                                    style={{
                                        cursor: 'pointer',
                                        // When selected, mimic the .card:hover styles from globals.css
                                        borderColor: isSelected ? 'var(--primary)' : undefined,
                                        transform: isSelected ? 'translateY(-10px)' : undefined,
                                        boxShadow: isSelected ? '0 20px 40px rgba(0, 0, 0, 0.1)' : undefined,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                                        {logoUrl && (
                                            <img
                                                src={withStrapiPublicUrl(logoUrl)}
                                                alt={content.title}
                                                style={{ width: '40px', height: '40px', objectFit: 'contain', marginRight: '1rem' }}
                                            />
                                        )}
                                        <h3 style={{ margin: 0 }}>{content.title}</h3>
                                    </div>
                                    <div className="rich-text" style={{ marginTop: '1rem' }}>
                                        {parseBlocks(content.description)}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '3rem' }}>
                            <h3>No products available yet.</h3>
                            <p style={{ opacity: 0.7 }}>Add new incremental products via your Strapi Admin panel.</p>
                        </div>
                    )}
                </div>

                {/* Buttons container */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '4rem',
                    paddingTop: '2rem'
                }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => router.push(buttonConfig.backLink)}
                    >
                        {buttonConfig.backLabel}
                    </button>

                    <button
                        className="btn btn-primary"
                        disabled={!selectedProduct}
                        onClick={() => {
                            const productObj = products.find(p => p.id === selectedProduct);
                            const title = productObj?.attributes?.title || productObj?.title || 'Unknown Product';
                            sessionStorage.setItem('selectedProduct', title);
                            router.push(buttonConfig.continueLink);
                        }}
                        style={{
                            opacity: selectedProduct ? 1 : 0.5,
                            cursor: selectedProduct ? 'pointer' : 'not-allowed',
                            pointerEvents: selectedProduct ? 'auto' : 'none'
                        }}
                    >
                        {buttonConfig.continueLabel}
                    </button>
                </div>
            </div>
        </section>
    );
}
