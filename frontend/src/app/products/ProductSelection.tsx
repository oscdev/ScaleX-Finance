'use client';

import React, { useState } from 'react';
import { withStrapiPublicUrl } from '@/lib/strapi';
import { useRouter } from 'next/navigation';
import './ProductSelection.css';

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
        <section className="product-selection-section value-props-section">
            <div className="container animate-fade-in delay-200">
                <div className="card-grid-2">
                    {products && products.length > 0 ? (
                        products.map((product: any, index: number) => {
                            const content = product.attributes || product;
                            const isSelected = selectedProduct === product.id;
                            const logoUrl = content.logo?.data?.attributes?.url || content.logo?.url;

                            return (
                                <div
                                    className={`card product-card ${isSelected ? 'selected' : ''}`}
                                    key={product.id || index}
                                    onClick={() => setSelectedProduct(product.id)}
                                >
                                    <div className="product-card-header">
                                        {logoUrl && (
                                            <img
                                                src={withStrapiPublicUrl(logoUrl)}
                                                alt={content.title}
                                                className="product-card-logo"
                                            />
                                        )}
                                        <h3 className="product-card-title">{content.title}</h3>
                                    </div>
                                    <div className="rich-text product-card-description">
                                        {parseBlocks(content.description)}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="products-empty">
                            <h3>No products available yet.</h3>
                            <p className="products-empty-note">Add new incremental products via your Strapi Admin panel.</p>
                        </div>
                    )}
                </div>

                {/* Buttons container */}
                <div className="products-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={() => router.push(buttonConfig.backLink)}
                    >
                        {buttonConfig.backLabel}
                    </button>

                    <button
                        className="btn btn-primary btn-continue"
                        disabled={!selectedProduct}
                        onClick={() => {
                            const productObj = products.find(p => p.id === selectedProduct);
                            const title = productObj?.attributes?.title || productObj?.title || 'Unknown Product';
                            sessionStorage.setItem('selectedProduct', title);
                            router.push(buttonConfig.continueLink);
                        }}
                    >
                        {buttonConfig.continueLabel}
                    </button>
                </div>
            </div>
        </section>
    );
}
